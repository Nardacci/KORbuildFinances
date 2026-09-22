// mp-webhook -- receives Mercado Pago notifications (preapproval and
// payment topics) and ALWAYS refetches the resource from the MP API
// before writing anything -- the webhook body itself is never trusted as
// the source of truth, only as a "go look at id X" signal.
//
// verify_jwt is off for this function (supabase/config.toml) since MP
// calls it with no Supabase user JWT -- auth here is MP's own webhook
// signature (x-signature/x-request-id, validated against MP_WEBHOOK_SECRET),
// same shape as compute-insights' x-cron-secret but MP's own scheme.
//
// past_due is driven ENTIRELY by payment events (installment approved/
// rejected), never by preapproval status -- confirmed in conversation
// against Mercado Pago's own retry docs: a failed installment enters
// `recycling` and MP retries automatically while the preapproval itself
// normally stays authorized. See 20260916160000_mercadopago_recurring_billing.sql
// for the full reasoning and the payment_grace_days value.
//
// KNOWN GAP (documented, not guessed): Mercado Pago's docs on how a
// payment resource links back to its preapproval are, per research done
// before writing this, "piecemeal" -- no single page enumerates the exact
// field. This code tries payment.preapproval_id first (documented for
// subscription-generated payments in some MP API responses), then falls
// back to external_reference (set to workspace_id at creation time in
// mp-create-subscription). If neither resolves a known payment_subscriptions
// row, the event is logged with workspace_id null and an error_message
// instead of guessing -- check payment_events for `unresolved_workspace`
// after the first real webhook traffic arrives.
//
// Deploy: supabase functions deploy mp-webhook
// Required secrets (not auto-injected):
//   supabase secrets set MP_ACCESS_TOKEN=<Mercado Pago production access token>
//   supabase secrets set MP_WEBHOOK_SECRET=<signature secret from the MP panel>
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET")!;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Mercado Pago signature scheme (developers.mercadopago.com, "Webhooks -
// Validação de origem"): x-signature is "ts=<unix>,v1=<hex hmac>"; the
// manifest hashed is "id:<data.id lowercase>;request-id:<x-request-id>;ts:<ts>;".
async function verifySignature(req: Request, url: URL): Promise<boolean> {
  // Any parsing/crypto failure here means "could not verify" -- never let
  // an unexpected exception fall through as an uncaught 500 that might
  // look like a different kind of failure than a rejected signature.
  try {
    const signatureHeader = req.headers.get("x-signature");
    const requestId = req.headers.get("x-request-id");
    if (!signatureHeader || !requestId) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => p.trim().split("=").map((s) => s.trim())),
    );
    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const dataId = (url.searchParams.get("data.id") || url.searchParams.get("id") || "").toLowerCase();
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = await hmacSha256Hex(MP_WEBHOOK_SECRET, manifest);
    return expected === v1;
  } catch {
    return false;
  }
}

async function fetchMp(path: string): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

function getNextPaymentDate(body: Record<string, unknown> | null): string | null {
  const value = body?.next_payment_date;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getRecurringStartDate(body: Record<string, unknown> | null): string | null {
  const recurring = body?.auto_recurring as Record<string, unknown> | undefined;
  const value = recurring?.start_date;
  return typeof value === "string" && value.length > 0 ? value : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Explicit fail-closed check: without MP_WEBHOOK_SECRET configured, no
  // signature could ever legitimately verify, so refuse deliberately
  // (clean 401) instead of letting an unset secret reach the HMAC call and
  // throw (still rejects -- crypto.subtle.importKey rejects a non-string
  // key -- but as an uncaught exception/500, not an intentional decision).
  if (!MP_WEBHOOK_SECRET) return json({ error: "webhook_not_configured" }, 401);

  const url = new URL(req.url);
  const verified = await verifySignature(req, url);
  if (!verified) return json({ error: "invalid_signature" }, 401);

  const notification = await req.json().catch(() => null);
  if (!notification) return json({ error: "invalid_body" }, 400);

  const topic: string = notification.type || notification.topic || "";
  const resourceId: string = String(notification.data?.id || notification.id || url.searchParams.get("data.id") || "");
  if (!resourceId) return json({ error: "missing_resource_id" }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const finances = admin.schema("finances");
  const now = new Date().toISOString();

  if (topic === "payment") {
    const { ok, status, body } = await fetchMp(`/v1/payments/${resourceId}`);
    if (!ok || !body) {
      await finances.from("payment_events").insert({
        mp_payment_id: resourceId, event_type: "payment_fetch_failed",
        raw_payload: body ?? { status }, error_message: `MP responded ${status}`,
      });
      return json({ error: "mp_fetch_failed" }, 502);
    }

    const preapprovalId: string | null =
      (body.preapproval_id as string | undefined) ||
      (body.metadata as Record<string, unknown> | undefined)?.preapproval_id as string | undefined ||
      null;
    const externalReference = body.external_reference as string | undefined;

    let sub = null as { workspace_id: string; status: string } | null;
    if (preapprovalId) {
      const { data } = await finances.from("payment_subscriptions").select("workspace_id, status")
        .eq("mp_preapproval_id", preapprovalId).maybeSingle();
      sub = data;
    }
    if (!sub && externalReference) {
      const { data } = await finances.from("payment_subscriptions").select("workspace_id, status")
        .eq("workspace_id", externalReference).maybeSingle();
      sub = data;
    }

    if (!sub) {
      await finances.from("payment_events").insert({
        mp_payment_id: resourceId, mp_preapproval_id: preapprovalId, event_type: "unresolved_workspace",
        raw_payload: body, error_message: "Could not map payment to a payment_subscriptions row",
      });
      return json({ received: true, warning: "unresolved_workspace" });
    }

    const paymentStatus = body.status as string; // approved | rejected | pending | ...

    if (paymentStatus === "approved") {
      // A late/replayed approval must never resurrect a subscription that was
      // already canceled locally. Re-fetch the Preapproval so the local
      // period end follows Mercado Pago's next scheduled charge, not
      // auto_recurring.end_date (which is the end of the recurrence itself).
      if (sub.status !== "canceled") {
        let nextPaymentDate: string | null = null;
        if (preapprovalId) {
          const preapproval = await fetchMp(`/preapproval/${preapprovalId}`);
          if (preapproval.ok && preapproval.body) {
            nextPaymentDate = getNextPaymentDate(preapproval.body);
          }
        }

        const updatePayload: Record<string, unknown> = {
          status: "active",
          past_due_since: null,
          updated_at: now,
        };
        if (nextPaymentDate) {
          updatePayload.current_period_end = nextPaymentDate;
        }

        await finances.from("payment_subscriptions")
          .update(updatePayload)
          .eq("workspace_id", sub.workspace_id);
      }
    } else if (paymentStatus === "rejected") {
      // Only stamp past_due_since on the FIRST failure of a cycle -- don't
      // reset the grace clock on every retry MP makes on its own.
      // A canceled subscription is terminal for access purposes and must
      // not be moved back into past_due by a late notification.
      if (sub.status !== "past_due" && sub.status !== "canceled") {
        await finances.from("payment_subscriptions")
          .update({ status: "past_due", past_due_since: now, updated_at: now })
          .eq("workspace_id", sub.workspace_id);
      }
    }

    await finances.from("payment_events").insert({
      workspace_id: sub.workspace_id, mp_preapproval_id: preapprovalId, mp_payment_id: resourceId,
      event_type: `payment_${paymentStatus}`, raw_payload: body, processed_at: now,
    });
    return json({ received: true });
  }

  if (topic === "preapproval" || topic === "subscription_preapproval") {
    const { ok, status, body } = await fetchMp(`/preapproval/${resourceId}`);
    if (!ok || !body) {
      await finances.from("payment_events").insert({
        mp_preapproval_id: resourceId, event_type: "preapproval_fetch_failed",
        raw_payload: body ?? { status }, error_message: `MP responded ${status}`,
      });
      return json({ error: "mp_fetch_failed" }, 502);
    }

    const { data: sub } = await finances.from("payment_subscriptions").select("workspace_id, status")
      .eq("mp_preapproval_id", resourceId).maybeSingle();
    if (!sub) {
      await finances.from("payment_events").insert({
        mp_preapproval_id: resourceId, event_type: "unresolved_workspace",
        raw_payload: body, error_message: "No payment_subscriptions row for this preapproval_id",
      });
      return json({ received: true, warning: "unresolved_workspace" });
    }

    const mpStatus = body.status as string; // authorized | paused | cancelled | pending

    // current_period_end represents the end of the currently paid billing
    // cycle. Mercado Pago exposes that boundary as next_payment_date on the
    // Preapproval response. auto_recurring.end_date is the end of the
    // recurrence itself and is therefore not the monthly cycle boundary.
    const nextPaymentDate = getNextPaymentDate(body);
    const recurringStartDate = getRecurringStartDate(body);

    // Only establish ACTIVE from the initial pending -> authorized
    // transition. Do not let a later preapproval notification overwrite
    // payment-driven past_due state.
    if (mpStatus === "authorized" && sub.status === "pending") {
      await finances.from("payment_subscriptions").update({
        status: "active",
        current_period_start: recurringStartDate ?? now,
        current_period_end: nextPaymentDate,
        updated_at: now,
      }).eq("workspace_id", sub.workspace_id);
    } else if (mpStatus === "cancelled" && sub.status !== "canceled") {
      // Preserve an already-known period end. If it was not populated yet,
      // use Mercado Pago's next_payment_date when available so cancellation
      // does not immediately remove access to an already-paid cycle.
      const updatePayload: Record<string, unknown> = {
        status: "canceled",
        updated_at: now,
      };

      const { data: currentSub } = await finances.from("payment_subscriptions")
        .select("current_period_end")
        .eq("workspace_id", sub.workspace_id)
        .maybeSingle();

      if (!currentSub?.current_period_end && nextPaymentDate) {
        updatePayload.current_period_end = nextPaymentDate;
      }

      await finances.from("payment_subscriptions")
        .update(updatePayload)
        .eq("workspace_id", sub.workspace_id);
    } else if (mpStatus === "paused") {
      await finances.from("payment_subscriptions")
        .update({ status: "paused", updated_at: now })
        .eq("workspace_id", sub.workspace_id);
    }

    await finances.from("payment_events").insert({
      workspace_id: sub.workspace_id, mp_preapproval_id: resourceId,
      event_type: `preapproval_${mpStatus}`, raw_payload: body, processed_at: now,
    });
    return json({ received: true });
  }

  // Unrecognized topic -- log and acknowledge (200) so MP doesn't retry
  // forever on something we deliberately don't handle.
  await finances.from("payment_events").insert({
    event_type: `unhandled_topic_${topic || "unknown"}`, raw_payload: notification,
  });
  return json({ received: true, warning: "unhandled_topic" });
});
