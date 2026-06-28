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

export type BusinessDomain = "healthcare_staffing" | "saas_customer_success" | "energy_field_service";

export type AccountSummary = {
  id: string;
  name: string;
  segment: string;
  domain: BusinessDomain;
  health: string;
  renewal_date?: string | null;
  description: string;
  supports_candidates: boolean;
  primary_user: string;
  metrics: DashboardMetric[];
  risk_trend: RiskTrendPoint[];
  metadata: Record<string, unknown>;
};

export type SourceCollection = "crm" | "interactions" | "knowledge" | "risks" | "candidates";

export type SourceEntry = {
  id: string;
  account_id: string;
  collection: SourceCollection;
  source_type: string;
  title: string;
  content: string;
  fields: Record<string, unknown>;
  created_at?: string;
};

export type CandidateProfile = {
  id: string;
  account_id: string;
  name: string;
  role: string;
  availability_date?: string | null;
  credentialing_status: string;
  bgv_status: string;
  fit_score: number;
  rate_variance_percent: number;
  missing_items: string[];
  risk_flags: string[];
  metadata: Record<string, unknown>;
};

export type BGVResult = {
  candidate_id: string;
  status: "verified" | "needs_review" | "blocked";
  score: number;
  summary: string;
  missing_items: string[];
  evidence: Evidence[];
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

export type DashboardState = {
  accounts: AccountSummary[];
  account: AccountSummary;
  recommendations: Recommendation[];
  memory: MemoryCard[];
  sources: Record<SourceCollection, SourceEntry[]>;
  candidates: CandidateProfile[];
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

export type GuideMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GuideChatResponse = {
  answer: string;
  suggestions: string[];
  confidence: number;
  mode: "live" | "demo-fallback";
};

export type OutcomeMetric = {
  label: string;
  before: string;
  after: string;
  delta: string;
  rationale: string;
};

export type OutcomeScorecard = {
  headline: string;
  overall_score: number;
  confidence: number;
  projected_impact: string;
  metrics: OutcomeMetric[];
};

export type EscalationItem = {
  title: string;
  owner: string;
  role: string;
  deadline: string;
  reason: string;
  evidence: string[];
  channel: string;
  priority: "critical" | "high" | "medium" | "low";
};

export type AccountIntelligence = {
  account_id: string;
  account_name: string;
  outcomes: OutcomeScorecard;
  escalations: EscalationItem[];
};

export type IntelligenceBriefsResponse = {
  mode: "live" | "demo-fallback";
  accounts: AccountIntelligence[];
};

export type BlueprintBuilderKey =
  | "source_types"
  | "memory_types"
  | "business_rules"
  | "recommendation_categories"
  | "success_metrics"
  | "agents_enabled";

export type BlueprintAccountDraft = {
  name: string;
  segment: string;
  description: string;
  primary_user: string;
  supports_candidates: boolean;
  domain?: BusinessDomain;
};

export type BlueprintSuggestionResponse = {
  account: BlueprintAccountDraft;
  options: Record<BlueprintBuilderKey, string[]>;
};

export type BlueprintOptionResponse = {
  options: string[];
};
