import { fallbackAccounts, fallbackCandidates, fallbackDashboardState, fallbackRecommendations, fallbackRun, fallbackSources } from "./demo-data";
import type {
  AgentRunResult,
  BGVResult,
  DashboardState,
  GuideChatResponse,
  GuideMessage,
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
  const account = fallbackAccounts.find((item) => item.id === accountId) ?? fallbackAccounts[0];
  return {
    ...fallbackDashboardState,
    accounts: fallbackAccounts,
    account,
    recommendations: fallbackRecommendations.filter((item) => item.account_id === account.id),
    sources: fallbackSources[account.id] ?? {
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
    return {
      ...fallback,
      ...data,
      accounts: data.accounts?.length ? data.accounts : fallbackAccounts,
      recommendations: data.recommendations?.length ? data.recommendations : fallback.recommendations,
      memory: data.memory?.length ? data.memory : fallback.memory,
      sources: data.sources ?? fallback.sources,
      candidates: data.candidates ?? fallback.candidates,
      metrics: data.metrics?.length ? data.metrics : fallback.metrics,
      riskTrend: data.riskTrend?.length ? data.riskTrend : fallback.riskTrend,
      demoInteraction: data.demoInteraction || fallback.demoInteraction,
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
    const account = fallbackAccounts.find((item) => item.id === accountId) ?? fallbackAccounts[0];
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
