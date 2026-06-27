import type { AccountSummary, AgentRunResult, CandidateProfile, DashboardState, Recommendation, SourceEntry } from "./types";

export const fallbackAccounts: AccountSummary[] = [
  {
    id: "acct-aarogya-health",
    name: "Aarogya Health Network",
    segment: "Healthcare staffing",
    domain: "healthcare_staffing",
    health: "amber",
    renewal_date: "2026-08-31",
    description:
      "Hospital network with urgent ICU nurse and Epic analyst staffing requirements across Bengaluru, Pune, and Hyderabad.",
    supports_candidates: true,
    primary_user: "Staffing Account Manager",
    metadata: {
      renewal_exposure: "INR 15.2 Cr",
      primary_sponsor: "Kavya Raman",
      economic_buyer: "Rohan Kulkarni",
    },
    metrics: [
      { label: "Critical reqs", value: "24", delta: "+8 this week" },
      { label: "SLA breach risk", value: "High", delta: "4-day start window" },
      { label: "Renewal exposure", value: "INR 15.2 Cr", delta: "Aug 31 renewal" },
      { label: "Memory confidence", value: "93%", delta: "18 sources linked" },
    ],
    risk_trend: [
      { day: "Mon", risk: 64, confidence: 73 },
      { day: "Tue", risk: 71, confidence: 78 },
      { day: "Wed", risk: 79, confidence: 84 },
      { day: "Thu", risk: 86, confidence: 88 },
      { day: "Fri", risk: 91, confidence: 93 },
    ],
  },
  {
    id: "acct-navapay-fintech",
    name: "NavaPay Fintech",
    segment: "SaaS customer success",
    domain: "saas_customer_success",
    health: "red",
    renewal_date: "2026-09-20",
    description:
      "Enterprise payments SaaS customer with API latency complaints, low adoption, and a renewal negotiation in progress.",
    supports_candidates: false,
    primary_user: "Customer Success Manager",
    metadata: {
      arr: "INR 9.6 Cr",
      primary_sponsor: "Suhani Bansal",
      technical_owner: "Vikram Sethi",
    },
    metrics: [
      { label: "Renewal risk", value: "Red", delta: "85 days to renewal" },
      { label: "Open blockers", value: "7", delta: "3 product escalations" },
      { label: "ARR at risk", value: "INR 9.6 Cr", delta: "Sep 20 renewal" },
      { label: "Memory confidence", value: "90%", delta: "15 sources linked" },
    ],
    risk_trend: [
      { day: "Mon", risk: 58, confidence: 69 },
      { day: "Tue", risk: 66, confidence: 74 },
      { day: "Wed", risk: 76, confidence: 80 },
      { day: "Thu", risk: 82, confidence: 86 },
      { day: "Fri", risk: 88, confidence: 90 },
    ],
  },
  {
    id: "acct-prithvigrid-energy",
    name: "PrithviGrid Utilities",
    segment: "Energy field service",
    domain: "energy_field_service",
    health: "amber",
    renewal_date: "2026-10-15",
    description:
      "Power distribution client managing transformer maintenance, outage response, technician dispatch, and monsoon safety compliance.",
    supports_candidates: false,
    primary_user: "Field Operations Manager",
    metadata: {
      contract_value: "INR 22.4 Cr",
      operations_head: "Harish Nambiar",
      safety_owner: "Ishita Rao",
    },
    metrics: [
      { label: "Open outages", value: "11", delta: "4 critical feeders" },
      { label: "SLA breach risk", value: "Medium", delta: "Monsoon load surge" },
      { label: "Contract exposure", value: "INR 22.4 Cr", delta: "Oct 15 renewal" },
      { label: "Memory confidence", value: "88%", delta: "14 sources linked" },
    ],
    risk_trend: [
      { day: "Mon", risk: 49, confidence: 64 },
      { day: "Tue", risk: 57, confidence: 70 },
      { day: "Wed", risk: 63, confidence: 76 },
      { day: "Thu", risk: 72, confidence: 82 },
      { day: "Fri", risk: 78, confidence: 88 },
    ],
  },
];

export const fallbackSources: Record<string, Record<SourceEntry["collection"], SourceEntry[]>> = {
  "acct-aarogya-health": {
    crm: [
      {
        id: "src-aarogya-crm-account",
        account_id: "acct-aarogya-health",
        collection: "crm",
        source_type: "crm_account",
        title: "CRM Account Profile - Aarogya Health Network",
        fields: {
          client_owner: "Kavya Raman",
          economic_buyer: "Rohan Kulkarni",
          renewal_date: "2026-08-31",
          contract_value: "INR 15.2 Cr",
        },
        content:
          "Aarogya has 24 urgent healthcare staffing requirements this week. Kavya Raman values reliable starts and Rohan Kulkarni needs premium-rate justification before approval.",
      },
      {
        id: "src-aarogya-crm-stakeholders",
        account_id: "acct-aarogya-health",
        collection: "crm",
        source_type: "crm_relationships",
        title: "Stakeholder Map - Aarogya",
        fields: {
          executive_sponsor: "Kavya Raman",
          cfo: "Rohan Kulkarni",
          compliance_lead: "Meera Nair",
          hiring_manager: "Siddharth Menon",
        },
        content:
          "Kavya dislikes surprises close to start dates. Meera Nair responds fastest to compliance escalations before noon. Siddharth wants conditional candidates clearly marked.",
      },
    ],
    interactions: [
      {
        id: "src-aarogya-meeting-june",
        account_id: "acct-aarogya-health",
        collection: "interactions",
        source_type: "meeting_transcript",
        title: "Meeting Notes - Aarogya Urgent Staffing Call",
        fields: { meeting_owner: "Ananya Suresh", attendees: "Kavya Raman, Rohan Kulkarni, Siddharth Menon" },
        content:
          "Aarogya needs the ICU shortlist by 4 PM. Ananya Sharma's Karnataka nursing license verification is pending. Premium rates above 10 percent need a cost-risk note.",
      },
      {
        id: "src-aarogya-mail-cfo",
        account_id: "acct-aarogya-health",
        collection: "interactions",
        source_type: "email_thread",
        title: "Email Thread - CFO Premium Rate Approval",
        fields: { from: "Rohan Kulkarni", deadline: "Friday 11 AM" },
        content:
          "Rohan requested a one-page premium-rate brief comparing vacancy cost, overtime exposure, patient-care risk, and backup candidate availability.",
      },
    ],
    knowledge: [
      {
        id: "src-aarogya-policy-credentialing",
        account_id: "acct-aarogya-health",
        collection: "knowledge",
        source_type: "credentialing_checklist",
        title: "Aarogya Healthcare Credentialing Checklist",
        fields: { policy_owner: "Meera Nair" },
        content:
          "Clinical candidates require active license verification, BGV, identity proof validation, immunization attestation, compliance packet, shift preference confirmation, and start-date availability.",
      },
      {
        id: "src-aarogya-policy-rate-card",
        account_id: "acct-aarogya-health",
        collection: "knowledge",
        source_type: "rate_card_policy",
        title: "Healthcare Staffing Rate Card Policy",
        fields: { threshold: "10 percent standard, 12 percent CFO approval" },
        content:
          "Variance above 12 percent requires CFO approval and a documented cost-risk comparison. Replacement guarantee can be offered only after verified credentialing.",
      },
    ],
    risks: [
      {
        id: "src-aarogya-incident-may",
        account_id: "acct-aarogya-health",
        collection: "risks",
        source_type: "sla_incident",
        title: "May SLA Breach RCA - Aarogya",
        fields: { severity: "high", root_cause: "late license verification" },
        content:
          "License verification was requested after candidate presentation. Two starts were delayed, overtime coverage increased, and renewal risk moved up.",
      },
    ],
    candidates: [],
  },
  "acct-navapay-fintech": {
    crm: [
      {
        id: "src-navapay-crm-account",
        account_id: "acct-navapay-fintech",
        collection: "crm",
        source_type: "crm_account",
        title: "CRM Account Profile - NavaPay Fintech",
        fields: { sponsor: "Suhani Bansal", technical_owner: "Vikram Sethi", arr: "INR 9.6 Cr" },
        content:
          "NavaPay is red-health because API latency and low reconciliation adoption threaten a September renewal.",
      },
    ],
    interactions: [
      {
        id: "src-navapay-meeting-qbr",
        account_id: "acct-navapay-fintech",
        collection: "interactions",
        source_type: "meeting_notes",
        title: "QBR Notes - NavaPay Renewal Risk",
        fields: { meeting_owner: "Ira Joshi" },
        content:
          "Suhani wants a concrete API latency recovery plan. Vikram wants RCA, prevention checklist, and a direct settlement-window escalation channel.",
      },
    ],
    knowledge: [
      {
        id: "src-navapay-knowledge-renewal",
        account_id: "acct-navapay-fintech",
        collection: "knowledge",
        source_type: "customer_success_playbook",
        title: "Enterprise SaaS Renewal Save Playbook",
        fields: { playbook_owner: "CS Ops" },
        content:
          "Red-health enterprise renewals within 90 days require a save plan with executive sponsor, technical owner, product owner, milestones, and success metrics.",
      },
    ],
    risks: [
      {
        id: "src-navapay-risk-latency",
        account_id: "acct-navapay-fintech",
        collection: "risks",
        source_type: "incident_review",
        title: "Latency Incident Review - NavaPay",
        fields: { severity: "critical" },
        content:
          "API latency spikes during settlement windows caused delayed payment confirmation and executive complaints.",
      },
    ],
    candidates: [],
  },
  "acct-prithvigrid-energy": {
    crm: [
      {
        id: "src-prithvigrid-crm-account",
        account_id: "acct-prithvigrid-energy",
        collection: "crm",
        source_type: "crm_account",
        title: "CRM Account Profile - PrithviGrid Utilities",
        fields: { operations_head: "Harish Nambiar", safety_owner: "Ishita Rao", contract_value: "INR 22.4 Cr" },
        content:
          "PrithviGrid has 11 open outage or maintenance tickets and is watching SLA adherence during monsoon load spikes.",
      },
    ],
    interactions: [
      {
        id: "src-prithvigrid-meeting-dispatch",
        account_id: "acct-prithvigrid-energy",
        collection: "interactions",
        source_type: "meeting_notes",
        title: "Dispatch Planning Notes - Monsoon Response",
        fields: { meeting_owner: "Raghav Bendre", region: "Maharashtra" },
        content:
          "Transformer T-42 near Nashik crossed heat threshold twice. Two assigned technicians have expired safety refresher certificates.",
      },
    ],
    knowledge: [
      {
        id: "src-prithvigrid-knowledge-safety",
        account_id: "acct-prithvigrid-energy",
        collection: "knowledge",
        source_type: "safety_policy",
        title: "Field Safety Lockout Policy",
        fields: { policy_owner: "Ishita Rao" },
        content:
          "Transformer maintenance requires lockout-tagout checklist, PPE verification, site permit, weather review, and current technician refresher status.",
      },
    ],
    risks: [
      {
        id: "src-prithvigrid-risk-sla",
        account_id: "acct-prithvigrid-energy",
        collection: "risks",
        source_type: "sla_incident",
        title: "June Feeder SLA Breach - PrithviGrid",
        fields: { severity: "medium", root_cause: "dispatch delay" },
        content:
          "Technician assignment was delayed because safety certification status was checked after dispatch instead of before.",
      },
    ],
    candidates: [],
  },
};

export const fallbackCandidates: CandidateProfile[] = [
  {
    id: "cand-ananya-sharma",
    account_id: "acct-aarogya-health",
    name: "Ananya Sharma",
    role: "ICU Nurse",
    availability_date: "2026-07-02",
    credentialing_status: "license verification pending",
    bgv_status: "background complete",
    fit_score: 92,
    rate_variance_percent: 8,
    missing_items: ["Karnataka nursing license verification"],
    risk_flags: ["start date within 4 days", "license pending"],
    metadata: { city: "Bengaluru", experience: "7 years ICU" },
  },
  {
    id: "cand-riya-menon",
    account_id: "acct-aarogya-health",
    name: "Riya Menon",
    role: "ICU Nurse",
    availability_date: "2026-07-04",
    credentialing_status: "immunization attestation pending",
    bgv_status: "background complete",
    fit_score: 84,
    rate_variance_percent: 11,
    missing_items: ["flu immunization attestation"],
    risk_flags: ["premium rate needs justification"],
    metadata: { city: "Pune", experience: "6 years ICU" },
  },
  {
    id: "cand-devika-iyer",
    account_id: "acct-aarogya-health",
    name: "Devika Iyer",
    role: "Emergency Ward Nurse",
    availability_date: "2026-07-01",
    credentialing_status: "fully verified",
    bgv_status: "verified",
    fit_score: 88,
    rate_variance_percent: 4,
    missing_items: [],
    risk_flags: ["needs night-shift confirmation"],
    metadata: { city: "Mysuru", experience: "5 years emergency care" },
  },
];

export const fallbackRecommendations: Recommendation[] = [
  {
    id: "rec-demo-1",
    account_id: "acct-aarogya-health",
    run_id: "run-demo",
    title: "Block Ananya Sharma from final shortlist until license clears",
    action:
      "Ask Meera Nair to verify Ananya Sharma's Karnataka nursing license before 2:30 PM and mark her conditional in the 4 PM shortlist.",
    category: "Credentialing",
    priority: "critical",
    owner_role: "Compliance Lead",
    due_date: "Today, 2:30 PM",
    confidence: 91,
    rationale:
      "The role starts within 4 days, license verification is pending, and Aarogya already had a renewal-risk incident from late license checks.",
    business_metric: "Reduce SLA breach risk and protect renewal confidence.",
    status: "pending",
    evidence: [
      {
        source_id: "src-aarogya-meeting-june",
        source_title: "Meeting Notes - Aarogya Urgent Staffing Call",
        source_type: "meeting_transcript",
        snippet: "Ananya Sharma's Karnataka nursing license verification is still pending.",
        relevance: 0.93,
      },
      {
        source_id: "src-aarogya-policy-credentialing",
        source_title: "Aarogya Healthcare Credentialing Checklist",
        source_type: "credentialing_checklist",
        snippet: "For starts within five days, credentialing blockers must be escalated before shortlist presentation.",
        relevance: 0.9,
      },
    ],
  },
  {
    id: "rec-demo-2",
    account_id: "acct-aarogya-health",
    run_id: "run-demo",
    title: "Send premium-rate approval brief to Rohan Kulkarni",
    action:
      "Prepare a one-page cost-risk brief comparing vacancy cost, overtime exposure, patient-care risk, and backup candidate availability.",
    category: "Commercial",
    priority: "high",
    owner_role: "Account Manager",
    due_date: "Friday, 11:00 AM",
    confidence: 86,
    rationale: "Rohan will not approve premium candidates above threshold without quantified business justification.",
    business_metric: "Improve approval speed while keeping rate variance defensible.",
    status: "pending",
    evidence: [
      {
        source_id: "src-aarogya-mail-cfo",
        source_title: "Email Thread - CFO Premium Rate Approval",
        source_type: "email_thread",
        snippet: "Rohan requested a one-page premium-rate brief comparing vacancy cost and overtime exposure.",
        relevance: 0.88,
      },
    ],
  },
];

export const fallbackDashboardState: DashboardState = {
  accounts: fallbackAccounts,
  account: fallbackAccounts[0],
  recommendations: fallbackRecommendations,
  memory: [
    {
      id: "mem-aarogya-profile",
      entity_type: "account",
      entity_id: "acct-aarogya-health",
      title: "Aarogya Account Profile",
      memory_type: "profile",
      summary: "Aarogya is renewal-sensitive, urgent ICU coverage is open, and credentialing misses affect executive trust.",
      confidence: 93,
    },
    {
      id: "mem-aarogya-rule-credentialing",
      entity_type: "account",
      entity_id: "acct-aarogya-health",
      title: "Credentialing Before Shortlist Rule",
      memory_type: "rule",
      summary: "For clinical starts within five days, license and BGV blockers must be escalated before shortlist presentation.",
      confidence: 96,
    },
  ],
  sources: fallbackSources["acct-aarogya-health"],
  candidates: fallbackCandidates,
  metrics: fallbackAccounts[0].metrics,
  riskTrend: fallbackAccounts[0].risk_trend,
  demoInteraction:
    "Aarogya needs the ICU shortlist by 4 PM. Ananya Sharma's Karnataka nursing license verification is pending. Premium rates above 10 percent need a cost-risk note.",
  mode: "demo-fallback",
};

export const fallbackRun: AgentRunResult = {
  run_id: "run-demo",
  account_id: "acct-aarogya-health",
  account_name: "Aarogya Health Network",
  analysis: {
    account_health: "amber: renewal-sensitive with active SLA breach risk",
    urgency_score: 91,
    risks: [
      "Clinical starts are within 4 days while license verification is unresolved.",
      "Rohan Kulkarni needs premium-rate justification before approval.",
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
      summary: "Retrieved CRM, candidate, policy, incident, and playbook evidence.",
      artifacts: ["Aarogya CRM", "Credentialing Checklist", "CFO Email Thread"],
    },
    {
      name: "Recommendation Agent",
      status: "completed",
      summary: "Produced ranked next best actions with owners, due dates, confidence, and evidence.",
      artifacts: ["2 next best actions"],
    },
  ],
  retrieved_context: fallbackRecommendations.flatMap((item) => item.evidence),
  memory_updates: [
    {
      memory_type: "episodic",
      summary: "Pending human review for generated next best actions.",
    },
  ],
  mode: "demo-fallback",
};
