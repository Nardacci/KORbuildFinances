-- KORbuild Finances
-- Schedules mp-reconcile every 15 minutes -- polling stopgap for Mercado
-- Pago preapproval state, since the signed Webhook (mp-webhook) does not
-- reliably deliver real payment/preapproval events for this integration
-- (confirmed 2026-09-25/26; KORbuild RH hit the identical problem earlier,
-- see korbuild/supabase/functions/mercadopago-reconcile/index.ts).
--
-- Uses its own dedicated vault secret (finances_reconcile_cron_secret),
-- same reasoning as daily-exchange-rate-sync's finances_fx_sync_cron_secret
-- -- not the shared 'cron_secret' also used by daily-ai-insights.
--
-- PREREQUISITE (the operator does this, not this migration -- both are
-- secret-store writes):
--   1. supabase secrets set FINANCES_RECONCILE_CRON_SECRET=<random value> --project-ref qasjgklmivxpisqfhngx
--   2. In the SQL editor:
--        select vault.create_secret('<the same random value>', 'finances_reconcile_cron_secret');

select cron.schedule(
  'mp-reconcile-15min',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/mp-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'finances_reconcile_cron_secret')
    ),
    body := jsonb_build_object('dry_run', false),
    timeout_milliseconds := 20000
  ) as request_id;
  $cron$
);
