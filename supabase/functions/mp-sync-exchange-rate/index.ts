// mp-sync-exchange-rate -- fetches USD/BRL and EUR/BRL from the Banco
// Central do Brasil's PTAX API and upserts finances.exchange_rates. Purely
// informational (billing.html shows the BRL price converted to USD/EUR) --
// never the real charged currency, which is always BRL via Mercado Pago.
//
// PTAX doesn't publish on weekends/holidays, so this walks back up to 7
// calendar days looking for the most recent day that has data, instead of
// failing when today (or the whole weekend) has nothing.
//
// verify_jwt is off for this function (supabase/config.toml) -- same
// pattern as compute-insights, invoked by pg_cron + pg_net with no
// Supabase user JWT, auth is the x-cron-secret header instead.
//
// Deploy: supabase functions deploy mp-sync-exchange-rate
// Required secret (not auto-injected): supabase secrets set FINANCES_FX_SYNC_CRON_SECRET=<random value>
//   (dedicated to this job -- deliberately NOT the shared CRON_SECRET nor any
//   KORbuild RH secret; the pg_cron job sends the same value from Vault secret
//   finances_fx_sync_cron_secret)
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FINANCES_FX_SYNC_CRON_SECRET = Deno.env.get("FINANCES_FX_SYNC_CRON_SECRET")!;

const MAX_LOOKBACK_DAYS = 7;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mmddyyyy(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getUTCFullYear()}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchUsdPtax(date: Date): Promise<number | null> {
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao='${mmddyyyy(date)}')?$format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const rate = data?.value?.[0]?.cotacaoVenda;
  return typeof rate === "number" ? rate : null;
}

async function fetchMoedaPtax(currency: string, date: Date): Promise<number | null> {
  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='${currency}'&@dataCotacao='${mmddyyyy(date)}'&$format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const rate = data?.value?.[0]?.cotacaoVenda;
  return typeof rate === "number" ? rate : null;
}

async function fetchWithFallback(
  currency: "USD" | "EUR",
): Promise<{ rate: number; date: string } | null> {
  const today = new Date();
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const rate = currency === "USD" ? await fetchUsdPtax(d) : await fetchMoedaPtax(currency, d);
    if (rate !== null) return { rate, date: isoDate(d) };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const providedSecret = req.headers.get("x-cron-secret");
  if (!providedSecret || providedSecret !== FINANCES_FX_SYNC_CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const finances = admin.schema("finances");

  const results: Record<string, { rate: number; date: string } | null> = {};
  for (const currency of ["USD", "EUR"] as const) {
    const found = await fetchWithFallback(currency);
    results[currency] = found;
    if (found) {
      await finances.from("exchange_rates").upsert(
        { currency, rate_to_brl: found.rate, rate_date: found.date },
        { onConflict: "currency,rate_date" },
      );
    }
  }

  const failed = Object.entries(results).filter(([, v]) => v === null).map(([k]) => k);
  if (failed.length) return json({ synced: results, warning: `no PTAX data found in last ${MAX_LOOKBACK_DAYS} days for: ${failed.join(", ")}` }, 207);
  return json({ synced: results });
});
