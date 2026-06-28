import { fallbackAccounts, fallbackCandidates, fallbackDashboardState, fallbackRecommendations, fallbackRun, fallbackSources } from "./demo-data";
import type {
  AccountIntelligence,
  AccountSummary,
  AgentRunResult,
  BGVResult,
  BlueprintBuilderKey,
  BlueprintOptionResponse,
  BlueprintSuggestionResponse,
  BusinessDomain,
  DashboardState,
  GuideChatResponse,
  GuideMessage,
  IntelligenceBriefsResponse,
  MemoryQueryResponse,
  SourceCollection,
  SourceEntry,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function fallbackForAccount(accountId: string): DashboardState {
  const account =
    fallbackAccounts.find((item) => item.id === accountId) ??
    ({
      id: accountId,
      name: "New Flow360 Account",
      segment: "Custom account",
      domain: "saas_customer_success",
      health: "new",
      renewal_date: null,
      description: "Custom account created from Domain Blueprint Studio.",
      supports_candidates: false,
      primary_user: "Account Manager",
      metadata: {},
      metrics: [
        { label: "Blueprint coverage", value: "New", delta: "created in studio" },
        { label: "Memory readiness", value: "Setup", delta: "add source data" },
        { label: "Decision status", value: "Pending", delta: "run planner" },
        { label: "Evidence coverage", value: "0", delta: "no sources yet" },
      ],
      risk_trend: [],
    } satisfies AccountSummary);
  const isFallbackDemo = fallbackAccounts.some((item) => item.id === account.id);
  return {
    ...fallbackDashboardState,
    accounts: fallbackAccounts,
    account,
    recommendations: isFallbackDemo ? fallbackRecommendations.filter((item) => item.account_id === account.id) : [],
    memory: isFallbackDemo ? fallbackDashboardState.memory.filter((item) => item.entity_id === account.id) : [],
    sources: isFallbackDemo && fallbackSources[account.id] ? fallbackSources[account.id] : {
      crm: [],
      interactions: [],
      knowledge: [],
      risks: [],
      candidates: [],
    },
    candidates: account.supports_candidates ? fallbackCandidates.filter((item) => item.account_id === account.id) : [],
    metrics: account.metrics,
    riskTrend: account.risk_trend,
  };
}

export async function getDashboardState(accountId = "acct-aarogya-health"): Promise<DashboardState> {
  try {
    const data = await request<DashboardState>(`/demo/state?account_id=${encodeURIComponent(accountId)}`);
    const fallback = fallbackForAccount(accountId);
    const returnedAccount = data.account ?? fallback.account;
    const isFallbackDemo = fallbackAccounts.some((item) => item.id === returnedAccount.id);
    return {
      ...fallback,
      ...data,
      accounts: data.accounts?.length ? data.accounts : fallbackAccounts,
      account: returnedAccount,
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : isFallbackDemo ? fallback.recommendations : [],
      memory: Array.isArray(data.memory) ? data.memory : isFallbackDemo ? fallback.memory : [],
      sources: data.sources ?? fallback.sources,
      candidates: data.candidates ?? fallback.candidates,
      metrics: data.metrics?.length ? data.metrics : fallback.metrics,
      riskTrend: data.riskTrend?.length ? data.riskTrend : fallback.riskTrend,
      demoInteraction: data.demoInteraction || returnedAccount.description || fallback.demoInteraction,
    };
  } catch {
    return fallbackForAccount(accountId);
  }
}

export async function runPlanner(accountId: string, interaction: string): Promise<AgentRunResult> {
  try {
    return await request<AgentRunResult>("/agent/run", {
      method: "POST",
      body: JSON.stringify({
        account_id: accountId,
        interaction,
        objective: "Recommend the next best actions for the selected account team.",
      }),
    });
  } catch {
    const account = fallbackAccounts.find((item) => item.id === accountId);
    if (!account) {
      return {
        ...fallbackRun,
        account_id: accountId,
        account_name: "Custom account",
        recommendations: [],
        analysis: {
          account_health: "Planner unavailable",
          missing_information: ["Backend must be running to generate account-specific recommendations."],
        },
      };
    }
    return {
      ...fallbackRun,
      account_id: account.id,
      account_name: account.name,
      recommendations: fallbackRecommendations.filter((item) => item.account_id === account.id),
    };
  }
}

export async function createSourceEntry(payload: {
  account_id: string;
  collection: SourceCollection;
  source_type: string;
  title: string;
  content: string;
  fields: Record<string, unknown>;
}) {
  return request<{ entry: SourceEntry }>("/sources", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reviewRecommendation(id: string, decision: "approved" | "rejected") {
  try {
    return await request(`/recommendations/${id}/review`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        reviewer: "demo.user@flow360.ai",
        notes: decision === "approved" ? "Accepted during hackathon demo." : "Needs more account context.",
      }),
    });
  } catch {
    return { review: { decision }, action_execution: decision === "approved" ? { status: "queued" } : null };
  }
}

export async function uploadDocument(file: File, accountId: string, collection: SourceCollection, sourceType = "uploaded_document") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("account_id", accountId);
  formData.append("source_type", sourceType);
  formData.append("collection", collection);

  const response = await fetch(`${API_URL}/ingest/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function runBGV(accountId: string, candidateId: string): Promise<BGVResult> {
  try {
    return await request<BGVResult>(`/candidates/${accountId}/${candidateId}/bgv`, { method: "POST" });
  } catch {
    const candidate = fallbackCandidates.find((item) => item.id === candidateId);
    const blocked = !!candidate?.missing_items.some((item) => item.toLowerCase().includes("license"));
    return {
      candidate_id: candidateId,
      status: blocked ? "blocked" : candidate?.missing_items.length ? "needs_review" : "verified",
      score: blocked ? 68 : candidate?.fit_score ?? 78,
      summary: candidate
        ? `${candidate.name} ${blocked ? "should not be shortlisted as fully cleared yet" : "can be considered with current verification status"}.`
        : "Candidate requires manual review.",
      missing_items: candidate?.missing_items ?? [],
      evidence: fallbackRecommendations[0]?.evidence ?? [],
    };
  }
}

export async function askMemory(accountId: string, question: string): Promise<MemoryQueryResponse> {
  try {
    return await request<MemoryQueryResponse>("/memory/query", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "account",
        entity_id: accountId,
        question,
      }),
    });
  } catch {
    const fallback = fallbackForAccount(accountId);
    return {
      answer:
        "Persistent memory points to urgent risk, missing decision context, and the need to run the planner after new source data is added.",
      confidence: 74,
      memory_used: fallback.memory,
      evidence_used: fallback.recommendations[0]?.evidence ?? [],
      mode: "demo-fallback",
    };
  }
}

export async function guideChat(payload: {
  account_id: string;
  current_view: string;
  visible_context: Record<string, unknown>;
  messages: GuideMessage[];
  question: string;
}): Promise<GuideChatResponse> {
  try {
    return await request<GuideChatResponse>("/guide/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    const screen = String(payload.visible_context.current_screen || payload.current_view || "this screen");
    return {
      answer: `You are on ${screen}. Use only the visible sidebar pages and buttons on this screen. Add or upload source data first; click Run Planner only when you want fresh recommendations from the current memory.`,
      suggestions: ["Save and ingest to memory", "Run Planner", "Open Memory"],
      confidence: 76,
      mode: "demo-fallback",
    };
  }
}

function fallbackIntelligence(): IntelligenceBriefsResponse {
  const accounts: AccountIntelligence[] = fallbackAccounts.map((account) => {
    const recommendations = fallbackRecommendations.filter((item) => item.account_id === account.id);
    const sources = fallbackSources[account.id] ?? { crm: [], interactions: [], knowledge: [], risks: [], candidates: [] };
    const sourceCount = Object.values(sources).reduce((total, entries) => total + entries.length, 0);
    const evidenceCount = recommendations.reduce((total, item) => total + item.evidence.length, 0);
    const top = recommendations[0];
    const confidenceMetric = account.metrics.find((item) => item.label.toLowerCase().includes("memory"));
    const confidence = Number.parseInt(confidenceMetric?.value ?? "72", 10) || 72;
    return {
      account_id: account.id,
      account_name: account.name,
      outcomes: {
        headline: `${account.name} has ${sourceCount} connected sources and ${recommendations.length} active recommendation paths.`,
        overall_score: Math.max(45, Math.min(94, 58 + sourceCount * 2 + Math.round(confidence / 8))),
        confidence,
        projected_impact: top
          ? `Completing "${top.title}" should reduce the visible risk around ${top.business_metric.toLowerCase()}.`
          : "Run the planner to calculate projected business impact from current memory.",
        metrics: [
          ["SLA breach risk reduced", account.health, top ? "Projected lower" : "N/A", top ? top.business_metric : "Run planner"],
          ["Approval time saved", "Manual evidence chase", evidenceCount ? "Evidence packet ready" : "N/A", `${evidenceCount} evidence links`],
          [
            "Recommendations approved/rejected",
            `${recommendations.filter((item) => item.status === "pending").length} pending`,
            `${recommendations.filter((item) => item.status === "approved").length} approved / ${recommendations.filter((item) => item.status === "rejected").length} rejected`,
            `${recommendations.length} total`,
          ],
          ["Evidence coverage", "Scattered", sourceCount >= 8 ? "High" : "Medium", `${sourceCount} sources`],
          ["Memory freshness", "Unverified", `${confidence}%`, confidenceMetric?.delta ?? "memory confidence"],
          [
            "Candidate clearance speed",
            account.supports_candidates ? "Credentialing queue" : "N/A",
            account.supports_candidates ? "BGV-ready after blockers close" : "N/A",
            account.supports_candidates ? "Candidate workflow enabled" : "No candidate workflow",
          ],
          ["Renewal risk movement", account.renewal_date ?? "N/A", "Lower if top actions close", "Projected"],
        ].map(([label, before, after, delta]) => ({
          label,
          before,
          after,
          delta,
          rationale: "Computed from the currently loaded account sources, memory, and recommendation state.",
        })),
      },
      escalations: [
        {
          title: top?.title ?? "Confirm accountable owner",
          owner: top?.owner_role ?? account.primary_user,
          role: top?.owner_role ?? account.primary_user,
          deadline: top?.due_date ?? "Next business day",
          reason: top?.rationale ?? "The account needs an owner before the next decision can move.",
          evidence: top?.evidence.map((item) => item.source_title).slice(0, 3) ?? ["Account memory"],
          channel: top?.priority === "critical" || top?.priority === "high" ? "Customer email + CRM task" : "CRM task",
          priority: top?.priority ?? "medium",
        },
      ],
    };
  });
  return { mode: "demo-fallback", accounts };
}

export async function getIntelligenceBriefs(): Promise<IntelligenceBriefsResponse> {
  try {
    return await request<IntelligenceBriefsResponse>("/intelligence/briefs");
  } catch {
    return fallbackIntelligence();
  }
}

export async function suggestBlueprint(payload: {
  account_text: string;
  domain: BusinessDomain;
  blueprint_title: string;
}): Promise<BlueprintSuggestionResponse> {
  return request<BlueprintSuggestionResponse>("/blueprints/suggest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function suggestBlueprintOptions(payload: {
  account_text: string;
  domain: BusinessDomain;
  category: BlueprintBuilderKey;
  instruction: string;
  selected_options: string[];
}): Promise<BlueprintOptionResponse> {
  return request<BlueprintOptionResponse>("/blueprints/options", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createBlueprintAccount(payload: {
  account_text: string;
  domain: BusinessDomain;
  name: string;
  segment: string;
  description: string;
  primary_user: string;
  supports_candidates: boolean;
  selections: Record<BlueprintBuilderKey, string[]>;
}): Promise<{ account: AccountSummary }> {
  return request<{ account: AccountSummary }>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
