// compute-insights -- nightly job that recomputes finances.ai_insights for
// every workspace, via finances.compute_ai_insights() (see migration
// 20260914233000_ai_insights.sql for the actual detection rule). Not
// user-facing: invoked by the pg_cron + pg_net schedule in
// 20260914233500_ai_insights_daily_schedule.sql, and can be triggered
// manually (e.g. to test) with the same shared secret.
//
// verify_jwt is off for this function (supabase/config.toml) since pg_net
// calls it with no Supabase user JWT -- auth here is the x-cron-secret
// header instead, checked against the CRON_SECRET Edge Function secret.
//
// Deploy: supabase functions deploy compute-insights
// Required secret (not auto-injected): supabase secrets set CRON_SECRET=<random value>
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const providedSecret = req.headers.get("x-cron-secret");
  if (!providedSecret || providedSecret !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin.schema("finances").rpc("compute_ai_insights");

  if (error) return json({ error: "compute_failed", message: error.message }, 500);
  return json({ insights_written: data });
});
