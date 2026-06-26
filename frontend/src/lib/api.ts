import { fallbackDashboardState, fallbackRun } from "./demo-data";
import type { AgentRunResult, DashboardState, MemoryQueryResponse } from "./types";

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

export async function getDashboardState(): Promise<DashboardState> {
  try {
    const data = await request<DashboardState>("/demo/state");
    return {
      ...fallbackDashboardState,
      ...data,
      recommendations: data.recommendations?.length
        ? data.recommendations
        : fallbackDashboardState.recommendations,
      memory: data.memory?.length ? data.memory : fallbackDashboardState.memory,
      metrics: data.metrics?.length ? data.metrics : fallbackDashboardState.metrics,
      riskTrend: data.riskTrend?.length ? data.riskTrend : fallbackDashboardState.riskTrend,
      demoInteraction: data.demoInteraction || fallbackDashboardState.demoInteraction,
    };
  } catch {
    return fallbackDashboardState;
  }
}

export async function runPlanner(interaction: string): Promise<AgentRunResult> {
  try {
    return await request<AgentRunResult>("/agent/run", {
      method: "POST",
      body: JSON.stringify({
        account_id: "acct-northstar-health",
        interaction,
        objective: "Recommend the next best actions for the account team.",
      }),
    });
  } catch {
    return fallbackRun;
  }
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
    return { decision };
  }
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("account_id", "acct-northstar-health");
  formData.append("source_type", "uploaded_document");

  const response = await fetch(`${API_URL}/ingest/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function askMemory(question: string): Promise<MemoryQueryResponse> {
  try {
    return await request<MemoryQueryResponse>("/memory/query", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "account",
        entity_id: "acct-northstar-health",
        question,
      }),
    });
  } catch {
    return {
      answer:
        "Persistent memory points to renewal sensitivity, prior credentialing misses, and urgent start-date risk. Confirm the approval owner, escalate license verification, and capture reviewer feedback after the action is accepted or rejected.",
      confidence: 74,
      memory_used: fallbackDashboardState.memory,
      evidence_used: fallbackDashboardState.recommendations[0]?.evidence ?? [],
      mode: "demo-fallback",
    };
  }
}
