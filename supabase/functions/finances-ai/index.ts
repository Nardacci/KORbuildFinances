// finances-ai — KORbuild Finances AI gateway.
//
// First increment: authenticate the caller, enforce the monthly request
// budget from finances.ai_workspace_limits (finances.ai_usage_log tracks
// consumption), and answer with a plain Claude Sonnet 5 call — no
// financial context or tool use yet. Those come once this plumbing (auth,
// budget gate, usage logging) is confirmed working end to end.
//
// Deploy: supabase functions deploy finances-ai
// Required secret (not auto-injected): supabase secrets set ANTHROPIC_API_KEY=<your Anthropic API key>
// Auto-injected by the platform: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.125.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const MODEL = "claude-sonnet-5";
const DEFAULT_MONTHLY_LIMIT = 100;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  try {
    const body = await req.json();
    message = String(body?.message ?? "").trim();
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

  const startedAt = Date.now();
  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are the KORbuild Finances assistant. Today you only answer general questions " +
        "-- financial context (balances, goals, plans, projections) is not wired in yet. " +
        "If asked about the user's specific numbers, say that feature is coming soon.",
      messages: [{ role: "user", content: message }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const answer = textBlock && "text" in textBlock ? textBlock.text : "";

    await finances.from("ai_usage_log").insert({
      workspace_id: workspaceId,
      feature: "chat",
      model: MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
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
