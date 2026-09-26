// mp-reconcile -- polling reconciliation for Mercado Pago preapproval state
// that the signed webhook (mp-webhook) never confirmed.
//
// Context: confirmed via direct testing (2026-09-25/26) that Mercado
// Pago's signed Webhook (payment/preapproval topics) reliably delivers
// notifications triggered by its own "Simulate" panel button, but a REAL
// preapproval authorization and a real preapproval cancellation -- both
// exercised end to end against this exact integration -- produced ZERO
// invocations of mp-webhook (confirmed via the function's own
// Logs/Invocations, not just an application-level absence). KORbuild RH's
// own mercadopago-webhook/mercadopago-reconcile hit the identical problem
// earlier and documented it as a separate, still-open investigation --
// see korbuild/supabase/functions/mercadopago-reconcile/index.ts's header
// comment. Rather than keep the product waiting on that investigation,
// this function asks Mercado Pago directly, the same stopgap pattern
// already proven there.
//
// Scope: only the recurring subscription (preapproval) side --
// finances.payment_subscriptions has no setup-fee concept, unlike
// KORbuild RH's subscriptions table, so there is no setup-fee reconciler
// here.
//
// past_due is intentionally NOT set from preapproval status here, same
// reasoning documented in mp-webhook: "past_due is driven ENTIRELY by
// payment events (installment approved/rejected), never by preapproval
// status". This function only reconciles what mp-webhook's own preapproval
// branch would have done for authorized/cancelled/paused/pending --
// recovering a past_due row via a successful retry payment is a payment-
// level event, out of scope for this function (mp-webhook's payment
// branch already handles that path when it does receive a payment
// notification).
//
// With workspace_id or mp_preapproval_id in the body: single-resource
// mode, for on-demand reconciliation (what this session did manually via
// curl before this function existed).
// With neither: BATCH mode, wired to a 15-minute pg_cron schedule (see
// the migration that creates the cron.job) -- sweeps every
// payment_subscriptions row not already 'canceled', idle for more than
// `minutes` (default 15), and re-checks its mp_preapproval_id.
//
// No job lock: unlike KORbuild RH's mercadopago-reconcile, this does not
// use an advisory lock against overlapping runs. Every write here is
// idempotent (it compares against the current local status before writing
// and no-ops if nothing changed), so the worst case from an overlap is a
// duplicate payment_events row, not incorrect state -- an acceptable
// tradeoff at this product's current subscriber volume. Revisit if that
// changes.
//
// Safety: `dry_run` defaults to true for every path -- reports what was
// found and what WOULD happen without writing. Pass dry_run:false to
// commit.
//
// Internal ops tool, not reachable with a plain Supabase user JWT
// (verify_jwt is off, see supabase/config.toml) -- every request must
// carry the same x-cron-secret header pg_cron sends. Never call it from
// billing.html.
//
// Deploy: supabase functions deploy mp-reconcile
// Required secrets (not auto-injected):
//   MP_ACCESS_TOKEN (already configured, shared with mp-webhook/mp-create-subscription/mp-cancel-subscription)
//   supabase secrets set FINANCES_RECONCILE_CRON_SECRET=<random value>
//     (dedicated to this job, same reasoning as FINANCES_FX_SYNC_CRON_SECRET --
//     the pg_cron job sends the same value from Vault secret finances_reconcile_cron_secret)
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const CRON_SECRET = Deno.env.get("FINANCES_RECONCILE_CRON_SECRET");

type MpResource = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Never lets a fetch()-level failure (DNS, connection refused, timeout)
// escape as an unhandled exception -- same hardening KORbuild RH's own
// mercadopago-reconcile/webhook applied after hitting exactly that.
async function fetchMp(path: string): Promise<{ ok: boolean; status: number; body: MpResource | null }> {
  try {
    const res = await fetch(`https://api.mercadopago.com${path}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    console.error("[mp-reconcile] Mercado Pago API request failed", path, error instanceof Error ? error.message : String(error));
    return { ok: false, status: 0, body: null };
  }
}

function getNextPaymentDate(body: MpResource | null): string | null {
  const value = body?.next_payment_date;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getRecurringStartDate(body: MpResource | null): string | null {
  const recurring = body?.auto_recurring as MpResource | undefined;
  const value = recurring?.start_date;
  return typeof value === "string" && value.length > 0 ? value : null;
}

type Lookup =
  | { found: false; reason: string }
  | { found: true; workspaceId: string; currentStatus: string; preapproval: MpResource };

async function findAndFetch(
  admin: SupabaseAdmin,
  opts: { workspaceId?: string; preapprovalId?: string },
): Promise<Lookup> {
  // Always resolve workspace_id/preapproval_id/status from OUR row first --
  // even when the caller already passed both ids (batch mode does), the
  // local `status` is only known by reading it, never by assumption.
  let query = admin.from("payment_subscriptions").select("workspace_id, mp_preapproval_id, status");
  query = opts.workspaceId ? query.eq("workspace_id", opts.workspaceId) : query.eq("mp_preapproval_id", opts.preapprovalId!);

  if (!opts.workspaceId && !opts.preapprovalId) return { found: false, reason: "no workspace_id or preapproval_id provided" };

  const { data, error } = await query.maybeSingle();
  if (error) return { found: false, reason: `payment_subscriptions lookup failed: ${error.message}` };
  if (!data?.mp_preapproval_id) {
    return { found: false, reason: `no payment_subscriptions row (with an mp_preapproval_id) for ${opts.workspaceId ? `workspace_id ${opts.workspaceId}` : `preapproval_id ${opts.preapprovalId}`}` };
  }

  const workspaceId = data.workspace_id as string;
  const preapprovalId = data.mp_preapproval_id as string;
  const currentStatus = data.status as string;

  const { ok, status, body } = await fetchMp(`/preapproval/${preapprovalId}`);
  if (!ok || !body) return { found: false, reason: `Mercado Pago responded ${status} for preapproval ${preapprovalId}` };

  return { found: true, workspaceId, currentStatus, preapproval: body };
}

async function reconcileOne(
  admin: SupabaseAdmin,
  opts: { workspaceId?: string; preapprovalId?: string; dryRun: boolean },
): Promise<Record<string, unknown>> {
  const lookup = await findAndFetch(admin, opts);
  if (!lookup.found) {
    return { workspace_id: opts.workspaceId ?? null, preapproval_id: opts.preapprovalId ?? null, action: "skipped", reason: lookup.reason };
  }

  const { workspaceId, currentStatus, preapproval } = lookup;
  const mpStatus = preapproval.status as string; // authorized | pending | paused | cancelled
  const now = new Date().toISOString();
  const base = {
    workspace_id: workspaceId,
    preapproval_id: String(preapproval.id),
    preapproval_status: mpStatus,
    local_status: currentStatus,
    dry_run: opts.dryRun,
  };

  const commit = async (updates: Record<string, unknown>, action: string) => {
    if (opts.dryRun) return { ...base, action: `would_${action}` };
    const { error: updateError } = await admin.from("payment_subscriptions").update(updates).eq("workspace_id", workspaceId);
    if (updateError) return { ...base, action: "failed", reason: updateError.message };
    const { error: logError } = await admin.from("payment_events").insert({
      workspace_id: workspaceId,
      mp_preapproval_id: String(preapproval.id),
      event_type: "subscription_reconciled",
      raw_payload: preapproval,
      processed_at: now,
    });
    if (logError) console.error("[mp-reconcile] payment_events insert failed", logError.message);
    return { ...base, action };
  };

  if (mpStatus === "authorized") {
    if (currentStatus === "active") {
      return { ...base, action: "no_change", reason: "already active and preapproval is still authorized" };
    }
    return await commit(
      {
        status: "active",
        past_due_since: null,
        current_period_start: getRecurringStartDate(preapproval) ?? now,
        current_period_end: getNextPaymentDate(preapproval),
        updated_at: now,
      },
      "activated",
    );
  }

  if (mpStatus === "cancelled") {
    if (currentStatus === "canceled") {
      return { ...base, action: "no_change", reason: "already canceled" };
    }
    return await commit({ status: "canceled", updated_at: now }, "canceled");
  }

  if (mpStatus === "paused") {
    if (currentStatus === "paused") {
      return { ...base, action: "no_change", reason: "already paused" };
    }
    return await commit({ status: "paused", updated_at: now }, "paused");
  }

  // "pending" (not yet authorized) or any future/unknown value -- nothing
  // actionable, never guess.
  return { ...base, action: "skipped", reason: `preapproval status is '${mpStatus}', no action defined for it` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // verify_jwt is off for this function (pg_cron's http_post has no
  // Supabase JWT to send), so this header is the ONLY gate -- fail closed
  // if the secret isn't configured, same reasoning as mp-webhook's own
  // MP_WEBHOOK_SECRET check.
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const finances = admin.schema("finances");
  const payload = await req.json().catch(() => ({}));
  // Explicit false required to actually write -- any other value (missing,
  // true, truthy) stays a dry run.
  const dryRun = payload?.dry_run !== false;

  if (payload?.workspace_id || payload?.preapproval_id) {
    return json(await reconcileOne(finances, {
      workspaceId: payload?.workspace_id ? String(payload.workspace_id) : undefined,
      preapprovalId: payload?.preapproval_id ? String(payload.preapproval_id) : undefined,
      dryRun,
    }));
  }

  // Batch mode: sweep every non-terminal subscription idle for more than
  // `minutes` (default 15).
  const minutes = Number(payload?.minutes) > 0 ? Number(payload.minutes) : 15;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const { data: candidates, error: candidatesError } = await finances
    .from("payment_subscriptions")
    .select("workspace_id, mp_preapproval_id")
    .in("status", ["pending", "active", "past_due", "paused"])
    .not("mp_preapproval_id", "is", null)
    .lt("updated_at", cutoff);
  if (candidatesError) return json({ error: "candidates_lookup_failed", message: candidatesError.message }, 500);

  const results: Record<string, unknown>[] = [];
  for (const row of (candidates || []) as { workspace_id: string; mp_preapproval_id: string }[]) {
    results.push(await reconcileOne(finances, { workspaceId: row.workspace_id, preapprovalId: row.mp_preapproval_id, dryRun }));
  }

  return json({ dry_run: dryRun, minutes, checked: (candidates || []).length, results });
});
