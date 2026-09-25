// mp-cancel-subscription -- cancels the CALLER's own workspace's Mercado
// Pago preapproval. Access stays ALLOWED until current_period_end (the
// period already paid for) -- this function never touches that column,
// only status/cancel_requested_at. get_workspace_access_status() is what
// actually enforces the "access continues until period end" rule.
//
// Owner check: same as mp-create-subscription -- finances.user_workspaces
// is 1:1 user<->workspace, so the caller's own workspace is the only one
// they can ever cancel.
//
// Deploy: supabase functions deploy mp-cancel-subscription
// Required secret (not auto-injected): supabase secrets set MP_ACCESS_TOKEN=<Mercado Pago production access token>
//   (same variable name mp-create-subscription and mp-webhook already use in this project)
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
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

  const { data: sub } = await finances
    .from("payment_subscriptions")
    .select("mp_preapproval_id, status, current_period_end")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!sub?.mp_preapproval_id) return json({ error: "no_active_subscription" }, 404);
  if (sub.status === "canceled") return json({ error: "already_canceled" }, 409);

  let mpResponse: Response;
  try {
    mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
  } catch (error) {
    return json({ error: "mp_request_failed", message: error instanceof Error ? error.message : String(error) }, 502);
  }

  const mpBody = await mpResponse.json().catch(() => null);
  if (!mpResponse.ok) {
    await finances.from("payment_events").insert({
      workspace_id: workspaceId,
      mp_preapproval_id: sub.mp_preapproval_id,
      event_type: "subscription_cancel_failed",
      raw_payload: mpBody ?? { status: mpResponse.status },
      error_message: `MP responded ${mpResponse.status}`,
    });
    return json({ error: "mp_cancel_failed", status: mpResponse.status, details: mpBody }, 502);
  }

  const now = new Date().toISOString();
  const { error: updateError } = await finances
    .from("payment_subscriptions")
    .update({ status: "canceled", cancel_requested_at: now, updated_at: now })
    .eq("workspace_id", workspaceId);
  if (updateError) return json({ error: "local_write_failed" }, 500);

  await finances.from("payment_events").insert({
    workspace_id: workspaceId,
    mp_preapproval_id: sub.mp_preapproval_id,
    event_type: "subscription_cancel_requested",
    raw_payload: mpBody,
    processed_at: now,
  });

  return json({ status: "canceled", current_period_end: sub.current_period_end });
});
