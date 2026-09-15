-- Schedules finances.compute_ai_insights() to run nightly via the
-- compute-insights Edge Function, using pg_cron + pg_net (the only native
-- Supabase mechanism to invoke an Edge Function on a schedule -- there is
-- no config.toml-based scheduling).
--
-- The shared secret compute-insights checks (x-cron-secret) is looked up
-- from Vault at run time (`vault.decrypted_secrets`, name 'cron_secret')
-- so it never appears in this migration file. Seed it once, manually, in
-- the SQL editor before this job's first real run:
--   select vault.create_secret('<the CRON_SECRET value>', 'cron_secret');
-- (the same value must also be set as the compute-insights Edge Function
-- secret: supabase secrets set CRON_SECRET=<value>)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'daily-ai-insights',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nowbohxeqwlddbfnukva.supabase.co/functions/v1/compute-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  ) AS request_id;
  $$
);
