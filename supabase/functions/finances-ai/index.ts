// finances-ai — KORbuild Finances AI gateway.
//
// Authenticates the caller, enforces the monthly request budget from
// finances.ai_workspace_limits (finances.ai_usage_log tracks consumption),
// and answers via Claude Sonnet 5. Financial-context capabilities so far:
// simulate_expense_scenario (impact of cutting/raising one expense category
// on the active goal), compare_plan_vs_reality (planned monthly contribution
// vs. what was actually invested), get_goal_status (current progress toward
// the active goal) and project_future_balance (balance projection with or
// without a goal). The first three share computeGoalBaseline(); all four
// ultimately share the same wealth/capacity math (sumAccountsWealth,
// sumMonthlyCapacity) so the tools and the Planejamento/Dashboard screens
// never disagree on a number.
//
// Deploy: supabase functions deploy finances-ai
// Required secret (not auto-injected): supabase secrets set ANTHROPIC_API_KEY=<your Anthropic API key>
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.125.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const MODEL = "claude-sonnet-5";
const DEFAULT_MONTHLY_LIMIT = 100;
const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORY_MESSAGES = 8; // last N turns (user+assistant) replayed to Claude
const MAX_HISTORY_MESSAGE_CHARS = 4000; // cap per stored message

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  // apikey/x-client-info are sent automatically by supabase-js's
  // functions.invoke() (the browser panel) -- without them listed here the
  // preflight OPTIONS request fails before the real call ever goes out.
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Kora, the KORbuild Finances assistant. If asked your name, say
Kora. Today you only answer general
questions and can run financial simulations against the workspace's active
goal -- full transaction history and free-form financial context are not
wired in yet. If asked about anything else specific to the user's numbers,
say that feature is coming soon.

You have access to four tools:
- simulate_expense_scenario: simulates cutting or raising spend in one
  expense category and its impact on the active goal.
- compare_plan_vs_reality: compares the planned monthly contribution with
  what was actually invested in the last 6 months.
- get_goal_status: returns the current status of the active goal (target,
  current wealth, remaining amount, progress, deadline).
- project_future_balance: projects the balance N months from now at the
  current savings pace. This is the only one of the four that works with
  no goal registered.

Rules for using their results:

- If a result has "category_candidates" (a list of category names) instead
  of a single "category_matched", do NOT pick one yourself. Ask the user
  which of the listed categories they meant (e.g. "Você quis dizer
  'Alimentação em casa' ou 'Alimentação fora'?") and only call the tool
  again once they confirm.
- If a result is {"error":"no_active_goal"}, explain that this needs a
  financial goal registered first and suggest the user create one in
  Planejamento. Do not invent goal numbers.
- project_future_balance requires months_horizon. If the user hasn't given
  a time horizon (in months or years), ask them how far ahead to project
  before calling the tool -- do not assume a default horizon.`;

const SCENARIO_TOOL: Anthropic.Tool = {
  name: "simulate_expense_scenario",
  description:
    "Simula o impacto de reduzir ou aumentar o gasto mensal em uma categoria de " +
    "despesa especifica sobre a meta financeira ativa do workspace (patrimonio " +
    "projetado no prazo da meta, e o aporte mensal necessario). Usa a media de " +
    "gastos realizados dos ultimos 6 meses como linha de base.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Nome da categoria de despesa como o usuario mencionou (ex: 'Alimentação').",
      },
      percent_change: {
        type: "number",
        description:
          "Variacao percentual do gasto na categoria. Negativo reduz o gasto, positivo aumenta. " +
          "Ex: -20 significa 'gastar 20% a menos'.",
      },
      months_horizon: {
        type: "number",
        description:
          "Horizonte em meses para a projecao. Opcional -- se omitido, usa o prazo restante da meta ativa.",
      },
    },
    required: ["category", "percent_change"],
  },
};

const COMPARE_TOOL: Anthropic.Tool = {
  name: "compare_plan_vs_reality",
  description:
    "Compara o aporte mensal planejado para a meta ativa com o que foi de fato " +
    "investido em media nos ultimos 6 meses, e o impacto disso em bater a meta " +
    "no prazo.",
  input_schema: {
    type: "object",
    properties: {
      months_horizon: {
        type: "number",
        description:
          "Horizonte em meses para a projecao. Opcional -- se omitido, usa o prazo restante da meta ativa.",
      },
    },
    required: [],
  },
};

const GOAL_STATUS_TOOL: Anthropic.Tool = {
  name: "get_goal_status",
  description:
    "Retorna o status atual da meta financeira ativa do workspace: nome, valor alvo, " +
    "patrimonio atual, quanto falta, percentual de progresso e prazo previsto.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

const PROJECT_BALANCE_TOOL: Anthropic.Tool = {
  name: "project_future_balance",
  description:
    "Projeta o saldo/patrimonio em N meses a partir do ritmo atual de poupanca " +
    "(renda menos despesa dos ultimos 6 meses), com ou sem meta cadastrada. " +
    "Nao assume nenhuma taxa de retorno de investimento.",
  input_schema: {
    type: "object",
    properties: {
      months_horizon: {
        type: "number",
        description: "Numero de meses para projetar o saldo futuro. Obrigatorio.",
      },
    },
    required: ["months_horizon"],
  },
};

// Validated and truncated server-side regardless of what the panel sends --
// this endpoint takes a plain user JWT, not just our own frontend, so it
// can't trust the caller to have kept MAX_HISTORY_MESSAGES or the
// user/assistant alternation the Anthropic API requires (must start on
// "user", and can't end on "user" right before the new turn we append).
function sanitizeHistory(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(
    (m): m is { role: string; content: string } =>
      !!m && typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" && m.content.trim().length > 0,
  );
  const truncated: Anthropic.MessageParam[] = valid.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.trim().slice(0, MAX_HISTORY_MESSAGE_CHARS),
  }));

  while (truncated.length && truncated[0].role !== "user") truncated.shift();
  while (truncated.length && truncated[truncated.length - 1].role === "user") truncated.pop();

  return truncated;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function startOfCurrentMonthUtc(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// Same calendar-month window planning.js uses (monthBounds/sixStart): the
// six months end at the START of NEXT month (so the current, still partial,
// month is included) and start at day 1 of (this month - 5). A tool that
// used a different window would silently disagree with the Planejamento
// screen on every average it reports.
function sixMonthWindowUtc(): { start: string; end: string } {
  const d = new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 5, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function currencyCode(raw: string | null | undefined): string {
  return String(raw || "").split(/\s+—\s+/)[0].trim().toUpperCase();
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Same projection math as planning.js -- kept in lockstep on purpose so a
// scenario and the Planejamento screen never disagree on how a goal is measured.
function futureValue(present: number, monthly: number, n: number, ratePct: number): number {
  const r = ratePct / 100;
  if (!n) return present;
  return present * Math.pow(1 + r, n) + monthly * (r ? (Math.pow(1 + r, n) - 1) / r : n);
}

function requiredMonthly(present: number, target: number, n: number, ratePct: number): number {
  if (target <= present || n <= 0) return 0;
  const r = ratePct / 100;
  const futurePresent = present * Math.pow(1 + r, n);
  const gap = target - futurePresent;
  return r ? Math.max(0, (gap * r) / (Math.pow(1 + r, n) - 1)) : gap / n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Same deadline math as dashboard.js's deadline(start_date, target_years).
function goalDeadlineIso(startDate: string | null, years: number): string | null {
  if (!startDate || !years) return null;
  const d = new Date(startDate + "T12:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function matchCategory(
  wanted: string,
  categories: { id: string; name: string }[],
): { matched: { id: string; name: string } } | { candidates: string[] } {
  const norm = normalize(wanted);
  const exact = categories.filter((c) => normalize(c.name) === norm);
  if (exact.length === 1) return { matched: exact[0] };
  if (exact.length > 1) return { candidates: exact.map((c) => c.name) };

  const partial = categories.filter(
    (c) => normalize(c.name).includes(norm) || norm.includes(normalize(c.name)),
  );
  if (partial.length === 1) return { matched: partial[0] };
  if (partial.length > 1) return { candidates: partial.map((c) => c.name) };

  // No match at all -- offer the real category list so the model asks
  // the user to pick one instead of guessing or inventing a name.
  return { candidates: categories.map((c) => c.name) };
}

// Pure math shared by computeGoalBaseline() and fetchWealthAndCapacity() --
// goal-independent on purpose, so a tool that doesn't need a goal (like
// project_future_balance) never has to go through goal-shaped code to get
// the same wealth/capacity numbers.
function sumAccountsWealth(
  accounts: { opening_balance: number | null; currency: string | null }[],
  positions: { position_value: number | null; currency: string | null }[],
  primary: string,
): number {
  const balance = accounts
    .filter((a) => currencyCode(a.currency) === primary)
    .reduce((s, a) => s + Number(a.opening_balance || 0), 0);
  const invested = positions
    .filter((p) => currencyCode(p.currency) === primary)
    .reduce((s, p) => s + Number(p.position_value || 0), 0);
  return balance + invested;
}

function sumMonthlyCapacity(
  incomes: { amount: number | null; currency: string | null; status: string }[],
  expenses: { amount: number | null; currency: string | null; status: string }[],
  primary: string,
): number {
  const income6 = incomes
    .filter((x) => x.status === "realized" && currencyCode(x.currency) === primary)
    .reduce((s, x) => s + Number(x.amount || 0), 0);
  const expense6 = expenses
    .filter((x) => x.status === "realized" && currencyCode(x.currency) === primary)
    .reduce((s, x) => s + Number(x.amount || 0), 0);
  return Math.max(0, (income6 - expense6) / 6);
}

interface WealthAndCapacity {
  primary: string;
  currentWealth: number;
  capacity: number;
}

type WealthAndCapacityResult = WealthAndCapacity | { error: "data_lookup_failed" };

// Counterpart of computeGoalBaseline() that never requires a goal to exist --
// used by project_future_balance, the one tool that must work with no active
// goal at all. It still peeks at the active goal (if any) for
// include_initial_wealth/initial_wealth, applying the exact same override
// computeGoalBaseline() does: every tool must report the same "current
// wealth" for the same workspace in the same conversation, even in the
// (product-level, pre-existing) case where that then disagrees with the
// Dashboard screen, which never applies this override.
async function fetchWealthAndCapacity(
  userClient: SupabaseClient,
  workspaceId: string,
): Promise<WealthAndCapacityResult> {
  const finances = userClient.schema("finances");
  const { start: sixStart, end: sixEnd } = sixMonthWindowUtc();

  const [
    { data: workspaceRow, error: workspaceErr },
    { data: goals, error: goalsErr },
    { data: accounts, error: accountsErr },
    { data: positions, error: positionsErr },
    { data: incomes, error: incomesErr },
    { data: expenses, error: expensesErr },
  ] = await Promise.all([
    finances.from("user_workspaces").select("primary_currency").eq("id", workspaceId).maybeSingle(),
    finances
      .from("goals")
      .select("include_initial_wealth,initial_wealth,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1),
    finances.from("accounts").select("opening_balance,currency").eq("workspace_id", workspaceId),
    finances.from("investment_positions").select("position_value,currency").eq("workspace_id", workspaceId),
    finances
      .from("incomes")
      .select("amount,currency,status,receipt_date")
      .eq("workspace_id", workspaceId)
      .gte("receipt_date", sixStart)
      .lt("receipt_date", sixEnd),
    finances
      .from("expenses")
      .select("amount,currency,status,paid_date")
      .eq("workspace_id", workspaceId)
      .gte("paid_date", sixStart)
      .lt("paid_date", sixEnd),
  ]);
  const firstError = workspaceErr || goalsErr || accountsErr || positionsErr || incomesErr || expensesErr;
  if (firstError) return { error: "data_lookup_failed" };

  const primary = currencyCode(workspaceRow?.primary_currency || "BRL");
  const accountsWealth = sumAccountsWealth(accounts || [], positions || [], primary);
  const goal = (goals || [])[0];
  const currentWealth = goal?.include_initial_wealth ? Number(goal.initial_wealth || 0) : accountsWealth;

  return {
    primary,
    currentWealth,
    capacity: sumMonthlyCapacity(incomes || [], expenses || [], primary),
  };
}

interface GoalBaseline {
  primary: string;
  goalName: string;
  startDate: string | null;
  years: number;
  currentWealth: number;
  months: number;
  target: number;
  rate: number;
  monthlyPlan: number;
  capacity: number; // avg monthly (income - expense) over the last 6 months
  realInvestment: number; // avg monthly actual investment contribution, last 6 months
  requiredMonthly: number;
  projectedFromCapacity: number;
  projectedFromPlan: number;
  realProjected: number;
  categories: { id: string; name: string }[];
  realizedExpenses: { amount: number; category_id: string | null }[];
}

type GoalBaselineResult = GoalBaseline | { error: "no_active_goal" | "goal_data_lookup_failed" };

// Shared by every tool that needs "where does the active goal stand today" --
// fetches the same tables planning.js reads (via the caller's own RLS-scoped
// client, so this can only ever see the caller's workspace) and runs the same
// projection math, once. Tools built on top only add what's specific to them
// (e.g. category matching for simulate_expense_scenario).
async function computeGoalBaseline(
  userClient: SupabaseClient,
  workspaceId: string,
  monthsOverride?: number,
): Promise<GoalBaselineResult> {
  const finances = userClient.schema("finances");
  const { start: sixStart, end: sixEnd } = sixMonthWindowUtc();

  const [
    { data: workspaceRow, error: workspaceErr },
    { data: goals, error: goalsErr },
    { data: plans, error: plansErr },
    { data: accounts, error: accountsErr },
    { data: positions, error: positionsErr },
    { data: categories, error: categoriesErr },
    { data: expenses, error: expensesErr },
    { data: incomes, error: incomesErr },
    { data: investmentTx, error: investmentTxErr },
  ] = await Promise.all([
    finances.from("user_workspaces").select("primary_currency").eq("id", workspaceId).maybeSingle(),
    finances
      .from("goals")
      .select("id,name,target_amount,target_years,start_date,include_initial_wealth,initial_wealth,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1),
    finances
      .from("plans")
      .select("goal_id,projected_monthly_contribution,projected_monthly_rate,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1),
    finances.from("accounts").select("opening_balance,currency").eq("workspace_id", workspaceId),
    finances.from("investment_positions").select("position_value,currency").eq("workspace_id", workspaceId),
    finances.from("expense_categories").select("id,name").eq("workspace_id", workspaceId),
    finances
      .from("expenses")
      .select("amount,currency,status,paid_date,category_id")
      .eq("workspace_id", workspaceId)
      .gte("paid_date", sixStart)
      .lt("paid_date", sixEnd),
    finances
      .from("incomes")
      .select("amount,currency,status,receipt_date")
      .eq("workspace_id", workspaceId)
      .gte("receipt_date", sixStart)
      .lt("receipt_date", sixEnd),
    finances
      .from("investment_transactions")
      .select("amount,currency,transaction_type,transaction_date")
      .eq("workspace_id", workspaceId)
      .gte("transaction_date", sixStart)
      .lt("transaction_date", sixEnd),
  ]);
  const firstError =
    workspaceErr || goalsErr || plansErr || accountsErr || positionsErr || categoriesErr || expensesErr ||
    incomesErr || investmentTxErr;
  if (firstError) return { error: "goal_data_lookup_failed" };

  const goal = (goals || [])[0];
  if (!goal) return { error: "no_active_goal" };

  const plan = (plans || [])[0];
  const primary = currencyCode(workspaceRow?.primary_currency || "BRL");
  const rate = Number(plan?.projected_monthly_rate || 0);
  const monthlyPlan = Number(plan?.projected_monthly_contribution || 0);
  const target = Number(goal.target_amount || 0);
  const months = Number.isFinite(monthsOverride) && (monthsOverride as number) > 0
    ? Math.round(monthsOverride as number)
    : Math.max(0, Math.round(Number(goal.target_years || 0) * 12));

  const accountsWealth = sumAccountsWealth(accounts || [], positions || [], primary);
  const currentWealth = goal.include_initial_wealth ? Number(goal.initial_wealth || 0) : accountsWealth;
  const capacity = sumMonthlyCapacity(incomes || [], expenses || [], primary);

  const realizedExpenses = (expenses || []).filter(
    (x) => x.status === "realized" && currencyCode(x.currency) === primary,
  );

  const invest6 = (investmentTx || [])
    .filter(
      (x) =>
        ["contribution", "adjustment"].includes(x.transaction_type) && currencyCode(x.currency) === primary,
    )
    .reduce((s, x) => s + Number(x.amount || 0), 0);
  const realInvestment = Math.max(0, invest6 / 6);

  return {
    primary,
    goalName: goal.name || "Meta",
    startDate: goal.start_date ?? null,
    years: Number(goal.target_years || 0),
    currentWealth,
    months,
    target,
    rate,
    monthlyPlan,
    capacity,
    realInvestment,
    requiredMonthly: requiredMonthly(currentWealth, target, months, rate),
    projectedFromCapacity: futureValue(currentWealth, capacity, months, rate),
    projectedFromPlan: futureValue(currentWealth, monthlyPlan, months, rate),
    realProjected: futureValue(currentWealth, realInvestment, months, rate),
    categories: categories || [],
    realizedExpenses: realizedExpenses.map((x) => ({ amount: Number(x.amount || 0), category_id: x.category_id })),
  };
}

async function runScenarioTool(
  userClient: SupabaseClient,
  workspaceId: string,
  input: { category?: unknown; percent_change?: unknown; months_horizon?: unknown },
): Promise<Record<string, unknown>> {
  const base = await computeGoalBaseline(userClient, workspaceId, Number(input.months_horizon));
  if ("error" in base) return base;

  const categoryInput = String(input.category ?? "").trim();
  if (!categoryInput) return { error: "missing_category" };
  const match = matchCategory(categoryInput, base.categories);
  if ("candidates" in match) return { category_matched: null, category_candidates: match.candidates };

  const percentChange = Number(input.percent_change);
  if (!Number.isFinite(percentChange)) return { error: "invalid_percent_change" };

  const categoryAvgMonthly =
    base.realizedExpenses.filter((x) => x.category_id === match.matched.id).reduce((s, x) => s + x.amount, 0) / 6;

  const freedMonthly = categoryAvgMonthly * (-percentChange / 100);
  const scenarioCapacity = Math.max(0, base.capacity + freedMonthly);
  const scenarioProjected = futureValue(base.currentWealth, scenarioCapacity, base.months, base.rate);

  return {
    category_matched: match.matched.name,
    currency: base.primary,
    baseline: {
      monthly_capacity: round2(base.capacity),
      monthly_required: round2(base.requiredMonthly),
      projected_wealth_at_horizon: round2(base.projectedFromCapacity),
      target: round2(base.target),
    },
    scenario: {
      category_avg_monthly: round2(categoryAvgMonthly),
      monthly_capacity: round2(scenarioCapacity),
      projected_wealth_at_horizon: round2(scenarioProjected),
      reaches_target: scenarioProjected >= base.target,
    },
    delta: {
      monthly_amount: round2(freedMonthly),
      projected_wealth_diff: round2(scenarioProjected - base.projectedFromCapacity),
    },
  };
}

async function runCompareTool(
  userClient: SupabaseClient,
  workspaceId: string,
  input: { months_horizon?: unknown },
): Promise<Record<string, unknown>> {
  const base = await computeGoalBaseline(userClient, workspaceId, Number(input.months_horizon));
  if ("error" in base) return base;

  return {
    currency: base.primary,
    plan: {
      monthly_contribution: round2(base.monthlyPlan),
      projected_wealth_at_horizon: round2(base.projectedFromPlan),
      reaches_target: base.projectedFromPlan >= base.target,
    },
    reality: {
      avg_monthly_invested: round2(base.realInvestment),
      projected_wealth_at_horizon: round2(base.realProjected),
      reaches_target: base.realProjected >= base.target,
    },
    monthly_required: round2(base.requiredMonthly),
    target: round2(base.target),
  };
}

async function runGoalStatusTool(
  userClient: SupabaseClient,
  workspaceId: string,
): Promise<Record<string, unknown>> {
  const base = await computeGoalBaseline(userClient, workspaceId);
  if ("error" in base) return base;

  const progressPct = base.target ? Math.min(100, Math.max(0, (base.currentWealth / base.target) * 100)) : 0;
  const remaining = Math.max(0, base.target - base.currentWealth);

  return {
    currency: base.primary,
    name: base.goalName,
    target: round2(base.target),
    current_wealth: round2(base.currentWealth),
    remaining: round2(remaining),
    progress_pct: round2(progressPct),
    deadline: goalDeadlineIso(base.startDate, base.years),
  };
}

async function runProjectFutureBalanceTool(
  userClient: SupabaseClient,
  workspaceId: string,
  input: { months_horizon?: unknown },
): Promise<Record<string, unknown>> {
  const monthsHorizon = Number(input.months_horizon);
  if (!Number.isFinite(monthsHorizon) || monthsHorizon <= 0) return { error: "invalid_months_horizon" };

  const base = await fetchWealthAndCapacity(userClient, workspaceId);
  if ("error" in base) return base;

  const months = Math.round(monthsHorizon);
  // No goal means no registered rate -- project a straight savings pace,
  // not an invented investment return.
  const projected = futureValue(base.currentWealth, base.capacity, months, 0);

  return {
    currency: base.primary,
    current_wealth: round2(base.currentWealth),
    monthly_capacity: round2(base.capacity),
    months_horizon: months,
    projected_wealth_at_horizon: round2(projected),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  // Client scoped by the caller's own JWT -- finances RLS applies as-is,
  // so this can only ever see the caller's own workspace.
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

  let message = "";
  let history: Anthropic.MessageParam[] = [];
  try {
    const body = await req.json();
    message = String(body?.message ?? "").trim();
    history = sanitizeHistory(body?.history);
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!message) return json({ error: "empty_message" }, 400);

  // Service role client -- ai_workspace_limits/ai_usage_log have RLS
  // enabled with no policies (only this function touches them), same
  // reasoning as the admin screen: no direct client access to a table
  // that affects cost/billing.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const finances = admin.schema("finances");

  const { data: limit } = await finances
    .from("ai_workspace_limits")
    .select("monthly_request_limit,enabled")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const monthlyLimit = limit?.monthly_request_limit ?? DEFAULT_MONTHLY_LIMIT;
  const enabled = limit?.enabled ?? true;

  const { count: usedThisMonth } = await finances
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "success")
    .gte("created_at", startOfCurrentMonthUtc());

  if (!enabled || (usedThisMonth ?? 0) >= monthlyLimit) {
    await finances.from("ai_usage_log").insert({
      workspace_id: workspaceId,
      feature: "chat",
      model: MODEL,
      status: "blocked_budget",
    });
    return json({ error: "ai_limit_exceeded" }, 429);
  }

  // Passive context, not a tool: pre-computed behavioral insights (e.g. a
  // category consistently above its own average -- see
  // finances.compute_ai_insights()). One indexed select; appended to the
  // system prompt only when there's something to say.
  const { data: insightRows } = await finances
    .from("ai_insights")
    .select("summary")
    .eq("workspace_id", workspaceId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  const systemPrompt = insightRows && insightRows.length
    ? `${SYSTEM_PROMPT}\n\n## Contexto adicional (calculado automaticamente)\n${
      insightRows.map((r) => `- ${r.summary}`).join("\n")
    }`
    : SYSTEM_PROMPT;

  const startedAt = Date.now();
  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: message }];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let answer = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: [SCENARIO_TOOL, COMPARE_TOOL, GOAL_STATUS_TOOL, PROJECT_BALANCE_TOOL],
        messages,
      });
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      const textBlock = response.content.find((block) => block.type === "text");
      answer = textBlock && "text" in textBlock ? textBlock.text : "";

      if (response.stop_reason !== "tool_use") break;

      const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
      messages.push({ role: "assistant", content: response.content });
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const toolInput = block.input as Record<string, unknown>;
          let result: Record<string, unknown>;
          if (block.name === "simulate_expense_scenario") {
            result = await runScenarioTool(userClient, workspaceId, toolInput);
          } else if (block.name === "compare_plan_vs_reality") {
            result = await runCompareTool(userClient, workspaceId, toolInput);
          } else if (block.name === "get_goal_status") {
            result = await runGoalStatusTool(userClient, workspaceId);
          } else if (block.name === "project_future_balance") {
            result = await runProjectFutureBalanceTool(userClient, workspaceId, toolInput);
          } else {
            result = { error: "unknown_tool" };
          }
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        }),
      );
      messages.push({ role: "user", content: toolResults });
    }

    await finances.from("ai_usage_log").insert({
      workspace_id: workspaceId,
      feature: "chat",
      model: MODEL,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      latency_ms: Date.now() - startedAt,
      status: "success",
    });

    return json({ answer });
  } catch (error) {
    await finances.from("ai_usage_log").insert({
      workspace_id: workspaceId,
      feature: "chat",
      model: MODEL,
      latency_ms: Date.now() - startedAt,
      status: "error",
      error_message: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "ai_gateway_error" }, 502);
  }
});
