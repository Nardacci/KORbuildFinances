-- finances.ai_insights -- pre-computed behavioral insights (e.g. a category
-- that consistently overruns its own historical average), surfaced as
-- passive context to the finances-ai Edge Function. Not a table the client
-- reads/writes directly: RLS enabled with no policies, same posture as
-- ai_usage_log/ai_workspace_limits (only service-role code touches it).
--
-- Rows are fully replaced on every run of finances.compute_ai_insights() --
-- this is a recomputed cache, not a historical log, so it never
-- accumulates. expires_at is a safety net in case the nightly job
-- (supabase/functions/compute-insights) misses a run.

CREATE TABLE finances.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES finances.user_workspaces(id),
  insight_type text NOT NULL,
  category_id uuid REFERENCES finances.expense_categories(id),
  summary text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finances.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE INDEX ai_insights_workspace_idx ON finances.ai_insights (workspace_id, expires_at);

-- Detects a category whose spend has been consistently above its own
-- 6-month historical average: overran (avg + max(stddev, 30% of avg)) in
-- at least 3 of the last 6 completed calendar months, AND the most recent
-- completed month also overran (an active pattern, not a past spike that
-- already normalized). Requires >= 4 months of history per category before
-- it says anything (leave-one-out needs >= 3 OTHER months to build a
-- baseline from -- see below); reaching 3-of-N overrun months in practice
-- still needs close to the full 6-month window.
--
-- The avg/stddev each month is compared against are LEAVE-ONE-OUT: computed
-- from the *other* months in the window, not from the full 6-month set that
-- month itself belongs to. This isn't a style choice -- a self-referential
-- baseline (avg/stddev over the same window being tested) makes "3 of 6
-- months overran" mathematically unreachable: by the one-sided Chebyshev
-- (Cantelli) inequality, at most half of any dataset's points can exceed
-- mean + 1*stddev of that same dataset, and that bound is only ever touched
-- (never strictly exceeded) in a degenerate tie. 3-of-6 is exactly that
-- half, so with a self-inclusive baseline this branch could never fire,
-- regardless of the underlying spending data.
--
-- Currency comparison mirrors the existing convention used by
-- transfers_same_currency_amount_match, validate_investment_transaction_account
-- etc.: upper(split_part(trim(x), ' — ', 1)) -- kept identical on purpose so
-- this doesn't become a 4th divergent currency-equality rule.
CREATE OR REPLACE FUNCTION finances.compute_ai_insights()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM finances.ai_insights WHERE true;

  WITH monthly_category_spend AS (
    SELECT
      e.workspace_id,
      e.category_id,
      date_trunc('month', e.paid_date)::date AS month,
      sum(e.amount) AS total
    FROM finances.expenses e
    JOIN finances.user_workspaces w ON w.id = e.workspace_id
    WHERE e.status = 'realized'
      AND e.category_id IS NOT NULL
      AND upper(split_part(trim(e.currency), ' — ', 1)) = upper(split_part(trim(w.primary_currency), ' — ', 1))
      AND e.paid_date >= date_trunc('month', now()) - interval '6 months'
      AND e.paid_date <  date_trunc('month', now())
    GROUP BY 1, 2, 3
  ),
  group_stats AS (
    SELECT
      workspace_id, category_id,
      count(*)         AS n,
      sum(total)        AS sum_total,
      sum(total * total) AS sumsq_total,
      max(month)        AS last_month
    FROM monthly_category_spend
    GROUP BY 1, 2
    HAVING count(*) >= 3
  ),
  flagged AS (
    SELECT
      m.workspace_id, m.category_id, m.month, m.total, g.last_month,
      -- Leave-one-out mean/stddev of the OTHER (n-1) months, derived from
      -- sufficient statistics (sum, sum of squares) rather than a self-join.
      (g.sum_total - m.total) / (g.n - 1) AS avg_others,
      sqrt(
        greatest(
          ((g.sumsq_total - m.total * m.total)
            - power(g.sum_total - m.total, 2) / (g.n - 1)) / (g.n - 1),
          0
        )
      ) AS stddev_others
    FROM monthly_category_spend m
    JOIN group_stats g USING (workspace_id, category_id)
    WHERE g.n >= 4 -- leave-one-out needs >= 3 OTHER months to compare against
  ),
  scored AS (
    SELECT
      workspace_id, category_id, month, total, last_month,
      (total > avg_others + greatest(stddev_others, 0.3 * avg_others)) AS overran
    FROM flagged
  ),
  results AS (
    SELECT
      workspace_id,
      category_id,
      count(*) FILTER (WHERE overran)                             AS overrun_months,
      count(*)                                                     AS months_with_data,
      bool_or(overran) FILTER (WHERE month = last_month)           AS last_month_overran,
      round(avg(total)::numeric, 2)                                AS avg_monthly,
      round((array_agg(total ORDER BY month DESC))[1]::numeric, 2) AS last_month_total
    FROM scored
    GROUP BY workspace_id, category_id
    HAVING count(*) FILTER (WHERE overran) >= 3
       AND bool_or(overran) FILTER (WHERE month = last_month)
  )
  INSERT INTO finances.ai_insights (workspace_id, insight_type, category_id, summary, data, expires_at)
  SELECT
    r.workspace_id,
    'category_overrun',
    r.category_id,
    format(
      'A categoria "%s" ficou acima da media de gastos em %s dos ultimos %s meses (media mensal ~%s %s, ultimo mes %s %s).',
      coalesce(c.name, 'Sem categoria'),
      r.overrun_months,
      r.months_with_data,
      upper(split_part(trim(w.primary_currency), ' — ', 1)),
      r.avg_monthly,
      upper(split_part(trim(w.primary_currency), ' — ', 1)),
      r.last_month_total
    ),
    jsonb_build_object(
      'overrun_months', r.overrun_months,
      'months_with_data', r.months_with_data,
      'avg_monthly', r.avg_monthly,
      'last_month_total', r.last_month_total
    ),
    now() + interval '2 days'
  FROM results r
  JOIN finances.user_workspaces w ON w.id = r.workspace_id
  LEFT JOIN finances.expense_categories c ON c.id = r.category_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Only the compute-insights Edge Function (service role) calls this --
-- no client-facing role needs it.
GRANT EXECUTE ON FUNCTION finances.compute_ai_insights() TO service_role;
