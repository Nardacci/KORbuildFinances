-- KORbuild Finances
-- service_role had USAGE on the finances schema but NO table-level
-- privileges on any of its 27 tables (confirmed via has_table_privilege()
-- against qasjgklmivxpisqfhngx on 2026-09-25) -- every Edge Function that
-- writes to finances.* directly with the service role key (mp-webhook,
-- mp-create-subscription, mp-cancel-subscription, mp-sync-exchange-rate)
-- was silently failing to read/write.
--
-- Custom schemas (unlike `public`) don't get service_role privileges
-- automatically from the Supabase platform -- this has to be explicit,
-- and it never was. No DELETE: grepped every supabase/functions/*/index.ts
-- for `.delete(`, zero matches, so it is deliberately left out
-- (least privilege; add it later if a function actually needs it).

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA finances TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA finances GRANT SELECT, INSERT, UPDATE ON TABLES TO service_role;
