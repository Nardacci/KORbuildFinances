// mp-reconcile-self -- lets the CALLER force an immediate reconciliation
// of their OWN workspace's Mercado Pago preapproval against the real MP
// API, instead of waiting for the next mp-reconcile cron tick (up to 15
// minutes). Meant to be called by billing.html right after the user
// returns from Mercado Pago's checkout (see mp_return=1 in
// mp-create-subscription's back_url) -- the exact moment a fast status
// update matters most.
//
// Same reconciliation logic as mp-reconcile (authorized/cancelled/paused),
// but reachable with a normal Supabase user JWT (verify_jwt stays on,
// default) instead of the cron secret, because it is hard-scoped to the
// caller's own workspace -- same ownership pattern as
// mp-cancel-subscription/mp-create-subscription (finances.user_workspaces
// is 1:1 user<->workspace). The client never supplies a preapproval_id;
// it is always resolved server-side from the caller's own row.
//
// past_due is intentionally NOT set from preapproval status here, same
// reasoning as mp-webhook/mp-reconcile: it is driven exclusively by
// payment-level events.
//
// Deploy: supabase functions deploy mp-reconcile-self
// Required secret (already configured, shared with the other mp-* functions): MP_ACCESS_TOKEN
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MpResource = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function fetchMp(path: string): Promise<{ ok: boolean; status: number; body: MpResource | null }> {
  try {
    const res = await fetch(`https://api.mercadopago.com${path}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    console.error("[mp-reconcile-self] Mercado Pago API request failed", path, error instanceof Error ? error.message : String(error));
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

  const { data: workspace, error: workspaceError } = await userClient
    .schema("finances")
    .from("user_workspaces")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (workspaceError) return json({ error: "workspace_lookup_failed" }, 500);
  if (!workspace) return json({ error: "workspace_not_found" }, 404);
  const workspaceId: string = workspace.id;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const finances = admin.schema("finances");

  const { data: sub, error: subError } = await finances
    .from("payment_subscriptions")
    .select("mp_preapproval_id, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (subError) return json({ error: "local_read_failed" }, 500);
  if (!sub?.mp_preapproval_id) return json({ error: "no_subscription" }, 404);

  const preapprovalId = sub.mp_preapproval_id as string;
  const currentStatus = sub.status as string;

  const { ok, status, body: preapproval } = await fetchMp(`/preapproval/${preapprovalId}`);
  if (!ok || !preapproval) return json({ error: "mp_lookup_failed", status }, 502);

  const mpStatus = preapproval.status as string; // authorized | pending | paused | cancelled
  const now = new Date().toISOString();

  const commit = async (updates: Record<string, unknown>) => {
    const { error: updateError } = await finances.from("payment_subscriptions").update(updates).eq("workspace_id", workspaceId);
    if (updateError) return { ok: false, message: updateError.message };
    const { error: logError } = await finances.from("payment_events").insert({
      workspace_id: workspaceId,
      mp_preapproval_id: preapprovalId,
      event_type: "subscription_reconciled",
      raw_payload: preapproval,
      processed_at: now,
    });
    if (logError) console.error("[mp-reconcile-self] payment_events insert failed", logError.message);
    return { ok: true };
  };

  if (mpStatus === "authorized" && currentStatus !== "active") {
    const result = await commit({
      status: "active",
      past_due_since: null,
      current_period_start: getRecurringStartDate(preapproval) ?? now,
      current_period_end: getNextPaymentDate(preapproval),
      updated_at: now,
    });
    if (!result.ok) return json({ error: "local_write_failed" }, 500);
    return json({ status: "active", current_period_end: getNextPaymentDate(preapproval) });
  }

  if (mpStatus === "cancelled" && currentStatus !== "canceled") {
    const result = await commit({ status: "canceled", updated_at: now });
    if (!result.ok) return json({ error: "local_write_failed" }, 500);
    return json({ status: "canceled" });
  }

  if (mpStatus === "paused" && currentStatus !== "paused") {
    const result = await commit({ status: "paused", updated_at: now });
    if (!result.ok) return json({ error: "local_write_failed" }, 500);
    return json({ status: "paused" });
  }

  // Already in sync, or preapproval is still "pending" -- nothing to change.
  return json({ status: currentStatus, unchanged: true });
});
