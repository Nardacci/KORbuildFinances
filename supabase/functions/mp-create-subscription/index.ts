import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;

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
  const user = userData.user;

  const { data: workspace, error: workspaceError } = await userClient
    .schema("finances")
    .from("user_workspaces")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (workspaceError) return json({ error: "workspace_lookup_failed" }, 500);
  if (!workspace) return json({ error: "workspace_not_found" }, 404);
  const workspaceId: string = workspace.id;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const finances = admin.schema("finances");

  const { data: existing } = await finances
    .from("payment_subscriptions")
    .select("status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existing && (existing.status === "active" || existing.status === "past_due")) {
    return json({ error: "already_subscribed" }, 409);
  }

  const { data: pricing } = await finances
    .from("commercial_pricing_settings")
    .select("monthly_price, currency")
    .eq("id", true)
    .maybeSingle();

  const basePrice = Number(pricing?.monthly_price);
  const currency = String(pricing?.currency || "USD").trim().toUpperCase();

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return json({ error: "price_not_configured" }, 500);
  }

  let rateToBrl = 1;
  if (currency !== "BRL") {
    const { data: rate, error: rateError } = await finances
      .from("exchange_rates")
      .select("rate_to_brl")
      .eq("currency", currency)
      .order("rate_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateError || !rate?.rate_to_brl || Number(rate.rate_to_brl) <= 0) {
      return json({ error: "exchange_rate_not_available" }, 503);
    }
    rateToBrl = Number(rate.rate_to_brl);
  }

  const basePriceBrl = basePrice * rateToBrl;

  const { data: terms } = await finances
    .from("workspace_commercial_terms")
    .select("price_adjustment_percent")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const adjustmentPercent = Number(terms?.price_adjustment_percent || 0);
  const amountBrl = Math.round(basePriceBrl * (1 + adjustmentPercent / 100) * 100) / 100;

  if (!Number.isFinite(amountBrl) || amountBrl <= 0) {
    return json({ error: "price_not_configured" }, 500);
  }

  let mpResponse: Response;
  try {
    mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        reason: "KORbuild Finances - assinatura mensal",
        external_reference: workspaceId,
        payer_email: user.email,
        back_url: `${APP_BASE_URL}/billing.html`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amountBrl,
          currency_id: "BRL",
        },
      }),
    });
  } catch (error) {
    return json({ error: "mp_request_failed", message: error instanceof Error ? error.message : String(error) }, 502);
  }

  const mpBody = await mpResponse.json().catch(() => null);
  if (!mpResponse.ok || !mpBody?.id || !mpBody?.init_point) {
    const { error: logError } = await finances.from("payment_events").insert({
      workspace_id: workspaceId,
      event_type: "subscription_create_failed",
      raw_payload: mpBody ?? { status: mpResponse.status },
      error_message: `MP responded ${mpResponse.status}`,
    });
    if (logError) console.error("[mp-create-subscription] payment_events insert failed (subscription_create_failed)", logError.message);
    return json({ error: "mp_create_failed", status: mpResponse.status, details: mpBody }, 502);
  }

  const { error: upsertError } = await finances.from("payment_subscriptions").upsert({
    workspace_id: workspaceId,
    status: "pending",
    amount_brl: amountBrl,
    mp_preapproval_id: mpBody.id,
    mp_payer_id: mpBody.payer_id ? String(mpBody.payer_id) : null,
    past_due_since: null,
    cancel_requested_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id" });
  if (upsertError) return json({ error: "local_write_failed" }, 500);

  const { error: eventLogError } = await finances.from("payment_events").insert({
    workspace_id: workspaceId,
    mp_preapproval_id: mpBody.id,
    event_type: "subscription_created",
    raw_payload: mpBody,
    processed_at: new Date().toISOString(),
  });
  if (eventLogError) console.error("[mp-create-subscription] payment_events insert failed (subscription_created)", eventLogError.message);

  return json({ init_point: mpBody.init_point, preapproval_id: mpBody.id, amount_brl: amountBrl });
});
