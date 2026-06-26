export type Evidence = {
  source_id: string;
  source_title: string;
  source_type: string;
  snippet: string;
  relevance: number;
};

export type Recommendation = {
  id: string;
  account_id: string;
  run_id: string;
  title: string;
  action: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  owner_role: string;
  due_date: string;
  confidence: number;
  rationale: string;
  evidence: Evidence[];
  business_metric: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
};

export type AgentStep = {
  name: string;
  status: string;
  summary: string;
  artifacts: string[];
};

export type MemoryCard = {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  memory_type: "raw" | "semantic" | "episodic" | "profile" | "rule";
  summary: string;
  confidence: number;
  updated_at?: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
};

export type RiskTrendPoint = {
  day: string;
  risk: number;
  confidence: number;
};

export type DashboardState = {
  account: {
    id: string;
    name: string;
    segment: string;
  };
  recommendations: Recommendation[];
  memory: MemoryCard[];
  metrics: DashboardMetric[];
  riskTrend: RiskTrendPoint[];
  demoInteraction: string;
  mode: "live" | "demo-fallback";
};

export type AgentRunResult = {
  run_id: string;
  account_id: string;
  account_name: string;
  analysis: Record<string, unknown>;
  recommendations: Recommendation[];
  agent_trace: AgentStep[];
  retrieved_context: Evidence[];
  memory_updates: Array<Record<string, unknown>>;
  mode: "live" | "demo-fallback";
};

export type MemoryQueryResponse = {
  answer: string;
  confidence: number;
  memory_used: MemoryCard[];
  evidence_used: Evidence[];
  mode: "live" | "demo-fallback";
};
