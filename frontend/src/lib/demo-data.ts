import type { AgentRunResult, DashboardState, Recommendation } from "./types";

export const fallbackRecommendations: Recommendation[] = [
  {
    id: "rec-demo-1",
    account_id: "acct-northstar-health",
    run_id: "run-demo",
    title: "Escalate Priya N.'s license verification",
    action:
      "Ask compliance lead to verify Priya N.'s ICU license before the 4 PM shortlist and mark her as conditional until cleared.",
    category: "Compliance",
    priority: "critical",
    owner_role: "Compliance Lead",
    due_date: "Today, 2:30 PM",
    confidence: 89,
    rationale:
      "The role starts within 5 days, the account has prior credentialing misses, and Priya is the strongest ICU candidate.",
    business_metric: "Reduce SLA breach risk and protect renewal confidence.",
    status: "pending",
    evidence: [
      {
        source_id: "doc-candidate-shortlist-icu",
        source_title: "Candidate Shortlist - ICU Nurse Coverage",
        source_type: "candidate_shortlist",
        snippet:
          "Priya N. is available July 2, requested rate is 8 percent above card, and license verification is pending.",
        relevance: 0.91,
      },
      {
        source_id: "doc-staffing-playbook",
        source_title: "Strategic Staffing Escalation Playbook",
        source_type: "playbook",
        snippet:
          "For critical healthcare roles starting within 5 days, credentialing blockers must be escalated to compliance lead.",
        relevance: 0.88,
      },
    ],
  },
  {
    id: "rec-demo-2",
    account_id: "acct-northstar-health",
    run_id: "run-demo",
    title: "Send CFO cost-risk approval brief",
    action:
      "Prepare a one-page premium-rate justification comparing vacancy cost, overtime exposure, and replacement guarantee options.",
    category: "Commercial",
    priority: "high",
    owner_role: "Account Manager",
    due_date: "Friday, 11:00 AM",
    confidence: 84,
    rationale:
      "The CFO explicitly requested rate justification before approving premium candidates.",
    business_metric: "Improve approval speed while keeping rate variance defensible.",
    status: "pending",
    evidence: [
      {
        source_id: "doc-email-thread-cfo",
        source_title: "Email Thread - CFO Rate Approval",
        source_type: "email",
        snippet:
          "Daniel Iyer requested a rate justification by Friday noon and wants vacancy cost and overtime exposure compared.",
        relevance: 0.87,
      },
    ],
  },
  {
    id: "rec-demo-3",
    account_id: "acct-northstar-health",
    run_id: "run-demo",
    title: "Schedule executive renewal-risk check-in",
    action:
      "Book a 20-minute call with Maya Rao to confirm coverage plan, replacement guarantee, and escalation owner.",
    category: "Relationship",
    priority: "high",
    owner_role: "Client Partner",
    due_date: "Next 48 hours",
    confidence: 82,
    rationale:
      "The account is strategic, renewal is within 90 days, and competitor pressure is visible.",
    business_metric: "Protect renewal and increase stakeholder trust.",
    status: "pending",
    evidence: [
      {
        source_id: "doc-renewal-risk",
        source_title: "Renewal Risk Notes - Northstar Health",
        source_type: "account_health",
        snippet:
          "Renewal risk is medium-high with CFO pressure, competitor replacement guarantee, and prior credentialing misses.",
        relevance: 0.86,
      },
    ],
  },
];

export const fallbackDashboardState: DashboardState = {
  account: {
    id: "acct-northstar-health",
    name: "Northstar Health Network",
    segment: "Healthcare staffing",
  },
  recommendations: fallbackRecommendations,
  memory: [
    {
      id: "mem-profile-northstar",
      entity_type: "account",
      entity_id: "acct-northstar-health",
      title: "Account Profile",
      memory_type: "profile",
      summary:
        "Strategic healthcare staffing account with renewal on August 31, amber sentiment, and high sensitivity to credentialing misses.",
      confidence: 91,
    },
    {
      id: "mem-rule-healthcare-critical",
      entity_type: "account",
      entity_id: "acct-northstar-health",
      title: "Critical Healthcare SLA Rule",
      memory_type: "rule",
      summary:
        "For starts within 5 days, credentialing blockers must be escalated before candidate presentation.",
      confidence: 95,
    },
    {
      id: "mem-episodic-may-escalation",
      entity_type: "account",
      entity_id: "acct-northstar-health",
      title: "May Escalation Pattern",
      memory_type: "episodic",
      summary:
        "A prior late license verification caused stakeholder frustration and reduced account sentiment.",
      confidence: 88,
    },
  ],
  metrics: [
    { label: "Critical reqs", value: "18", delta: "+6 this week" },
    { label: "SLA breach risk", value: "High", delta: "5-day start window" },
    { label: "Renewal exposure", value: "$1.8M", delta: "Aug 31 renewal" },
    { label: "Memory confidence", value: "91%", delta: "7 sources linked" },
  ],
  riskTrend: [
    { day: "Mon", risk: 62, confidence: 71 },
    { day: "Tue", risk: 68, confidence: 74 },
    { day: "Wed", risk: 75, confidence: 79 },
    { day: "Thu", risk: 83, confidence: 84 },
    { day: "Fri", risk: 88, confidence: 91 },
  ],
  demoInteraction:
    "Meeting notes: Northstar Health needs 12 ICU nurses and 4 Epic analysts placed before July 5. Maya Rao said the current vendor missed two credentialing deadlines last quarter. The CFO is asking for a cost-risk view before approving premium rates. Priya N. is the strongest ICU candidate but license verification is still pending. The hiring manager wants a shortlist today and asked whether Flow360 can guarantee replacement coverage if a candidate drops before day 10.",
  mode: "demo-fallback",
};

export const fallbackRun: AgentRunResult = {
  run_id: "run-demo",
  account_id: "acct-northstar-health",
  account_name: "Northstar Health Network",
  analysis: {
    account_health: "amber: renewal-sensitive with active SLA breach risk",
    urgency_score: 91,
    risks: [
      "Critical healthcare starts are within 5 days while license verification is unresolved.",
      "The CFO needs premium-rate justification before approval.",
      "Prior credentialing misses increased renewal risk.",
    ],
  },
  recommendations: fallbackRecommendations,
  agent_trace: [
    {
      name: "Planner Agent",
      status: "completed",
      summary: "Selected a five-step staffing intelligence workflow.",
      artifacts: ["ingestion", "retrieval", "analysis", "recommendation", "memory"],
    },
    {
      name: "Retrieval Agent",
      status: "completed",
      summary: "Retrieved account, candidate, policy, and playbook evidence.",
      artifacts: ["CRM Account History", "Credentialing Checklist", "CFO Email Thread"],
    },
    {
      name: "Recommendation Agent",
      status: "completed",
      summary: "Produced ranked next best actions with owners, due dates, confidence, and evidence.",
      artifacts: ["3 next best actions"],
    },
  ],
  retrieved_context: fallbackRecommendations.flatMap((item) => item.evidence),
  memory_updates: [
    {
      memory_type: "episodic",
      summary: "Pending human review for generated staffing next best actions.",
    },
  ],
  mode: "demo-fallback",
};

