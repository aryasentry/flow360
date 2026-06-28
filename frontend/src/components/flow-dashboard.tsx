"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Database,
  FolderOpen,
  Loader2,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SearchCheck,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";

import {
  createSourceEntry,
  getDashboardState,
  guideChat,
  reviewRecommendation,
  runBGV,
  runPlanner,
  uploadDocument,
} from "@/lib/api";
import { fallbackDashboardState, pendingSourceSamples, type PendingSourceSample } from "@/lib/demo-data";
import type {
  AccountSummary,
  AgentRunResult,
  BGVResult,
  CandidateProfile,
  DashboardState,
  GuideMessage,
  MemoryCard,
  Recommendation,
  SourceCollection,
  SourceEntry,
} from "@/lib/types";

type ActiveView =
  | "today"
  | "accounts"
  | "dashboard"
  | "crm"
  | "interactions"
  | "knowledge"
  | "risks"
  | "candidates"
  | "memory"
  | "execution"
  | "trace";

type FieldSpec = { key: string; label: string; placeholder: string };
type ExecutionArtifactKey = "email" | "crm" | "escalation" | "sla" | "summary";

type ActionExecution = {
  id?: string;
  recommendation_id?: string;
  account_id?: string;
  title?: string;
  owner_role?: string;
  status?: string;
  draft?: string;
  artifacts?: Partial<Record<ExecutionArtifactKey, { title?: string; body?: string } | string>>;
  metadata?: {
    artifacts?: Partial<Record<ExecutionArtifactKey, { title?: string; body?: string } | string>>;
    next_steps?: string[];
    evidence_titles?: string[];
    approval_summary?: string;
  };
  next_steps?: string[];
  created_at?: string;
};

type MemoryLedgerState = "fresh" | "stale" | "contradicted" | "approved" | "inferred" | "review";

type MemoryLedgerItem = {
  id: string;
  title: string;
  source: string;
  state: MemoryLedgerState;
  stateLabel: string;
  trust: number;
  origin: string;
  plannerUse: string;
  why: string;
  evidence: string;
  rule: string;
};

type DailyBrief = {
  account: AccountSummary;
  score: number;
  level: "Critical" | "High" | "Watch" | "Stable";
  nextView: ActiveView;
  nextLabel: string;
  actionTitle: string;
  reason: string;
  changed: string;
  missing: string;
  sourceCounts: Record<SourceCollection, number>;
  signals: string[];
};

const priorityClass: Record<Recommendation["priority"], string> = {
  critical: "border-rose-200 bg-rose-100 text-rose-700",
  high: "border-amber-200 bg-amber-100 text-amber-700",
  medium: "border-sky-200 bg-sky-100 text-sky-700",
  low: "border-slate-200 bg-slate-100 text-slate-700",
};

const memoryTypeStyle = {
  profile: "border-indigo-200 bg-indigo-50 text-indigo-800",
  rule: "border-emerald-200 bg-emerald-50 text-emerald-800",
  episodic: "border-amber-200 bg-amber-50 text-amber-800",
  raw: "border-slate-200 bg-slate-50 text-slate-800",
  semantic: "border-cyan-200 bg-cyan-50 text-cyan-800",
} as const;

const ledgerStateStyle: Record<MemoryLedgerState, string> = {
  fresh: "border-emerald-200 bg-emerald-50 text-emerald-800",
  stale: "border-amber-200 bg-amber-50 text-amber-800",
  contradicted: "border-rose-200 bg-rose-50 text-rose-800",
  approved: "border-indigo-200 bg-indigo-50 text-indigo-800",
  inferred: "border-cyan-200 bg-cyan-50 text-cyan-800",
  review: "border-slate-200 bg-slate-50 text-slate-800",
};

const artifactTabs: Array<{ key: ExecutionArtifactKey; label: string; icon: typeof Mail }> = [
  { key: "email", label: "Customer Email", icon: Mail },
  { key: "crm", label: "CRM Task", icon: BriefcaseBusiness },
  { key: "escalation", label: "Escalation Note", icon: ShieldAlert },
  { key: "sla", label: "SLA Update", icon: BadgeCheck },
  { key: "summary", label: "Meeting Summary", icon: ClipboardList },
];

const sourceLabels: Record<SourceCollection, { title: string; subtitle: string; icon: typeof BriefcaseBusiness; upload: boolean }> = {
  crm: {
    title: "CRM Dashboard",
    subtitle: "Structured account, stakeholder, renewal, and deal context.",
    icon: BriefcaseBusiness,
    upload: true,
  },
  interactions: {
    title: "Meeting Notes, Transcripts And Mails",
    subtitle: "Every customer conversation becomes searchable memory.",
    icon: Mail,
    upload: true,
  },
  knowledge: {
    title: "Knowledge Base",
    subtitle: "Company policies, playbooks, checklists, rate cards, and best practices.",
    icon: BookOpen,
    upload: true,
  },
  risks: {
    title: "Risks And Incidents",
    subtitle: "Previous mistakes, SLA breaches, RCA notes, renewal risks, and blockers.",
    icon: ShieldAlert,
    upload: true,
  },
  candidates: {
    title: "Candidates And BGV",
    subtitle: "Candidate profiles, credentialing status, BGV checks, and shortlist readiness.",
    icon: Users,
    upload: true,
  },
};

const fieldSpecs: Record<SourceCollection, FieldSpec[]> = {
  crm: [
    { key: "client_owner", label: "Client owner", placeholder: "Kavya Raman" },
    { key: "decision_maker", label: "Decision maker", placeholder: "Rohan Kulkarni" },
    { key: "renewal_date", label: "Renewal date", placeholder: "2026-08-31" },
    { key: "contract_value", label: "Contract value", placeholder: "INR 15.2 Cr" },
  ],
  interactions: [
    { key: "interaction_type", label: "Type", placeholder: "meeting / email / transcript" },
    { key: "participants", label: "Participants", placeholder: "Kavya Raman, Meera Nair" },
    { key: "date", label: "Date", placeholder: "2026-06-27" },
    { key: "owner", label: "Owner", placeholder: "Ananya Suresh" },
  ],
  knowledge: [
    { key: "policy_owner", label: "Owner", placeholder: "Meera Nair" },
    { key: "applies_to", label: "Applies to", placeholder: "clinical candidates" },
    { key: "rule_type", label: "Rule type", placeholder: "credentialing" },
    { key: "severity", label: "Severity", placeholder: "critical" },
  ],
  risks: [
    { key: "severity", label: "Severity", placeholder: "high" },
    { key: "root_cause", label: "Root cause", placeholder: "late license verification" },
    { key: "impact", label: "Impact", placeholder: "two delayed starts" },
    { key: "owner", label: "Owner", placeholder: "Siddharth Menon" },
  ],
  candidates: [
    { key: "name", label: "Candidate name", placeholder: "Ananya Sharma" },
    { key: "role", label: "Role", placeholder: "ICU Nurse" },
    { key: "credentialing_status", label: "Credentialing", placeholder: "license verification pending" },
    { key: "bgv_status", label: "BGV status", placeholder: "background complete" },
  ],
};

function emptySources(): Record<SourceCollection, SourceEntry[]> {
  return { crm: [], interactions: [], knowledge: [], risks: [], candidates: [] };
}

function sourceTypeFor(collection: SourceCollection) {
  return {
    crm: "crm_update",
    interactions: "customer_interaction",
    knowledge: "knowledge_article",
    risks: "risk_incident",
    candidates: "candidate_profile",
  }[collection];
}

const viewLabels: Record<ActiveView, string> = {
  today: "Today",
  accounts: "Accounts",
  dashboard: "Dashboard",
  crm: "CRM",
  interactions: "Meetings & Mail",
  knowledge: "Knowledge",
  risks: "Risks",
  candidates: "Candidates/BGV",
  memory: "Memory",
  execution: "Execution",
  trace: "Trace",
};

function stringifyField(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

function splitListField(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function oneLine(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function artifactFromExecution(execution: ActionExecution | null, key: ExecutionArtifactKey) {
  const raw = execution?.artifacts?.[key] ?? execution?.metadata?.artifacts?.[key];
  if (!raw) return null;
  if (typeof raw === "string") return { title: artifactTabs.find((item) => item.key === key)?.label ?? key, body: raw };
  return {
    title: raw.title ?? artifactTabs.find((item) => item.key === key)?.label ?? key,
    body: raw.body ?? "",
  };
}

function buildArtifactDraft(account: AccountSummary, recommendation: Recommendation, key: ExecutionArtifactKey) {
  const evidenceTitles = recommendation.evidence.map((item) => item.source_title).filter(Boolean);
  const evidenceLine = evidenceTitles.length ? evidenceTitles.slice(0, 3).join("; ") : "current account memory and retrieved context";
  const action = oneLine(recommendation.action, recommendation.title);
  const metric = oneLine(recommendation.business_metric, "improve the account outcome");

  const drafts: Record<ExecutionArtifactKey, { title: string; body: string }> = {
    email: {
      title: "Customer Email Draft",
      body: `Subject: ${account.name} - ${recommendation.title}

Hi team,

Following the latest review, we recommend the next step below:

${action}

Why this matters:
${recommendation.rationale}

Evidence checked:
${evidenceLine}

Owner: ${recommendation.owner_role}
Due: ${recommendation.due_date}
Target outcome: ${metric}

Please confirm if we can proceed with this plan or if another stakeholder should be included before execution.`,
    },
    crm: {
      title: "CRM Task",
      body: `Task: ${recommendation.title}
Account: ${account.name}
Owner: ${recommendation.owner_role}
Due: ${recommendation.due_date}
Priority: ${recommendation.priority}
Confidence: ${recommendation.confidence}%

Description:
${action}

Evidence to attach:
${evidenceLine}

Completion checklist:
- Confirm the named owner accepted the task.
- Attach evidence or customer communication.
- Update renewal/SLA risk after completion.
- Record result as human-reviewed memory.`,
    },
    escalation: {
      title: "Internal Escalation Note",
      body: `Escalation: ${recommendation.title}
Account: ${account.name}
Business risk: ${metric}

Decision needed:
${action}

Reason for escalation:
${recommendation.rationale}

Evidence:
${evidenceLine}

Ask:
Assign ${recommendation.owner_role} to complete this by ${recommendation.due_date}, then update Flow360 memory with the outcome.`,
    },
    sla: {
      title: "SLA / Risk Register Update",
      body: `Account: ${account.name}
Update type: Next best action approved
Risk level: ${recommendation.priority}
Action: ${recommendation.title}

SLA or business metric affected:
${metric}

Mitigation:
${action}

Control evidence:
${evidenceLine}

Follow-up:
Review after the due date and mark the result as resolved, delayed, or escalated.`,
    },
    summary: {
      title: "Meeting Summary",
      body: `Decision Summary

Flow360 recommended: ${recommendation.title}

Approved action:
${action}

Reasoning:
${recommendation.rationale}

Sources used:
${evidenceLine}

Owner and timing:
${recommendation.owner_role} - ${recommendation.due_date}

Memory update:
Future planner runs should remember that this action was reviewed by a human and should compare similar recommendations against the same evidence pattern.`,
    },
  };

  return drafts[key];
}

function buildMemoryLedgerItems(
  memory: MemoryCard[],
  sources: Record<SourceCollection, SourceEntry[]>,
  account: AccountSummary,
): MemoryLedgerItem[] {
  const flatSources = Object.entries(sources).flatMap(([collection, entries]) =>
    entries.map((entry) => ({ collection: collection as SourceCollection, entry })),
  );
  return memory.slice(0, 12).map((item) => {
    const match = flatSources.find(({ entry }) => entry.title === item.title || item.id.endsWith(entry.id));
    const origin = match ? titleCase(match.collection === "interactions" ? "meetings_mail" : match.collection) : titleCase(item.memory_type);
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    const state: MemoryLedgerState =
      haystack.includes("approved") || haystack.includes("human review")
        ? "approved"
        : haystack.includes("blocked") ||
            haystack.includes("not be shortlisted") ||
            haystack.includes("pending") ||
            haystack.includes("contradict")
          ? "contradicted"
          : item.memory_type === "episodic" && (haystack.includes("rca") || haystack.includes("sla") || haystack.includes("incident"))
            ? "stale"
            : item.memory_type === "semantic" || haystack.includes("pattern") || haystack.includes("inferred")
              ? "inferred"
              : item.confidence >= 84
                ? "fresh"
                : "review";
    const stateLabel: Record<MemoryLedgerState, string> = {
      fresh: "Fresh",
      stale: "Stale warning",
      contradicted: "Needs review",
      approved: "Human-approved",
      inferred: "AI-inferred",
      review: "Review",
    };
    const plannerUse: Record<MemoryLedgerState, string> = {
      fresh: "Use directly",
      stale: "Use as warning",
      contradicted: "Block automation",
      approved: "Raise trust",
      inferred: "Explain pattern",
      review: "Ask human",
    };
    const why: Record<MemoryLedgerState, string> = {
      fresh: "This source is current enough to influence ranking, confidence, and due-date urgency.",
      stale: "This older event still matters as a failure pattern, but should not override newer source data.",
      contradicted: "This memory contains blockers or unresolved status, so Flow360 should avoid unsafe automatic execution.",
      approved: "A human has reviewed this decision or memory, so the planner can trust it more strongly in future runs.",
      inferred: "This is useful pattern memory created by the system, but it should explain recommendations instead of executing them alone.",
      review: "Confidence is not high enough for silent use, so the user should validate it before approval.",
    };
    const rule: Record<MemoryLedgerState, string> = {
      fresh: "Allow this memory to support recommendations and evidence citations.",
      stale: "Use this memory as risk context and ask for fresh data if the recommendation depends on it.",
      contradicted: "Require human review before using this memory to approve an external action.",
      approved: "Prioritize this memory when similar evidence appears in future planner runs.",
      inferred: "Use for explanation and pattern detection, not as the only basis for approval.",
      review: "Lower recommendation confidence until this memory is confirmed by a source or reviewer.",
    };

    return {
      id: item.id,
      title: item.title,
      source: match?.entry.source_type ?? item.memory_type,
      state,
      stateLabel: stateLabel[state],
      trust: item.confidence,
      origin,
      plannerUse: plannerUse[state],
      why: why[state],
      evidence: `Origin: ${origin}. Account: ${account.name}. Confidence: ${item.confidence}%. Summary: ${oneLine(item.summary, "No summary available.")}`,
      rule: rule[state],
    };
  });
}

function latestSource(sources: Record<SourceCollection, SourceEntry[]>) {
  const entries = Object.values(sources)
    .flat()
    .filter(Boolean);
  return entries.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0] ?? null;
}

function buildDailyBrief(data: DashboardState): DailyBrief {
  const account = data.account;
  const sources = data.sources ?? emptySources();
  const sourceCounts = Object.fromEntries(
    Object.entries(sources).map(([key, value]) => [key, value.length]),
  ) as Record<SourceCollection, number>;
  const topRecommendation = data.recommendations[0];
  const candidateBlockers = data.candidates.filter(
    (candidate) => candidate.missing_items.length > 0 || candidate.credentialing_status.toLowerCase().includes("pending"),
  );
  const latest = latestSource(sources);
  const healthScore = account.health === "red" ? 38 : account.health === "amber" ? 26 : 12;
  const priorityScore = topRecommendation
    ? { critical: 34, high: 26, medium: 16, low: 8 }[topRecommendation.priority]
    : 6;
  const blockerScore = candidateBlockers.length ? Math.min(22, 8 + candidateBlockers.length * 4) : 0;
  const renewalScore = account.metrics.some((metric) => /renewal|exposure|arr|sla|risk/i.test(`${metric.label} ${metric.value}`)) ? 10 : 0;
  const missingScore =
    (sourceCounts.crm < 2 ? 5 : 0) +
    (sourceCounts.interactions < 2 ? 6 : 0) +
    (sourceCounts.knowledge < 1 ? 6 : 0) +
    (sourceCounts.risks < 1 ? 6 : 0);
  const score = Math.min(99, healthScore + priorityScore + blockerScore + renewalScore + missingScore);
  const level: DailyBrief["level"] = score >= 82 ? "Critical" : score >= 66 ? "High" : score >= 46 ? "Watch" : "Stable";

  let nextView: ActiveView = "dashboard";
  let nextLabel = "Open Dashboard";
  let missing = "No major context gaps. Review the top recommendation and decide.";
  if (account.supports_candidates && candidateBlockers.length) {
    nextView = "candidates";
    nextLabel = "Open Candidates/BGV";
    missing = `${candidateBlockers.length} candidate blocker${candidateBlockers.length > 1 ? "s" : ""} need verification before safe execution.`;
  } else if (sourceCounts.interactions < 2) {
    nextView = "interactions";
    nextLabel = "Add Meeting/Mail";
    missing = "Latest customer conversation is thin; add meeting notes or mail before trusting a new plan.";
  } else if (sourceCounts.risks < 1 || account.health === "red") {
    nextView = "risks";
    nextLabel = "Open Risks";
    missing = account.health === "red" ? "Risk is high; confirm current RCA, owner, and customer impact." : "No risk/RCA context is connected yet.";
  } else if (sourceCounts.crm < 2) {
    nextView = "crm";
    nextLabel = "Open CRM";
    missing = "Add stakeholder, renewal, owner, or deal context to improve recommendations.";
  }

  const changed = latest
    ? `${latest.title} was the latest connected source from ${titleCase(latest.collection === "interactions" ? "meetings_mail" : latest.collection)}.`
    : "No new source entry is connected yet.";
  const actionTitle = topRecommendation?.title ?? "Capture missing context before running the planner";
  const reason = topRecommendation?.rationale ?? account.description;
  const signals = [
    `${Object.values(sourceCounts).reduce((total, count) => total + count, 0)} source entries connected`,
    `${data.memory.length} memory cards available`,
    topRecommendation ? `${topRecommendation.priority} priority recommendation` : "planner not run yet",
    candidateBlockers.length ? `${candidateBlockers.length} candidate blocker${candidateBlockers.length > 1 ? "s" : ""}` : `${account.health} account health`,
  ];

  return {
    account,
    score,
    level,
    nextView,
    nextLabel,
    actionTitle,
    reason,
    changed,
    missing,
    sourceCounts,
    signals,
  };
}

export function FlowDashboard() {
  const [state, setState] = useState<DashboardState>(fallbackDashboardState);
  const [accountId, setAccountId] = useState(fallbackDashboardState.account.id);
  const [activeView, setActiveView] = useState<ActiveView>("today");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [guideCollapsed, setGuideCollapsed] = useState(true);
  const [dailyStates, setDailyStates] = useState<Record<string, DashboardState>>({
    [fallbackDashboardState.account.id]: fallbackDashboardState,
  });
  const [run, setRun] = useState<AgentRunResult | null>(null);
  const [selected, setSelected] = useState<Recommendation | null>(fallbackDashboardState.recommendations[0] ?? null);
  const [interaction, setInteraction] = useState(fallbackDashboardState.demoInteraction);
  const [isRunning, setIsRunning] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, { title: string; content: string; fields: Record<string, string> }>>({});
  const [loadedPendingIds, setLoadedPendingIds] = useState<Record<string, string>>({});
  const [ingestedPendingIds, setIngestedPendingIds] = useState<Record<string, boolean>>({});
  const [bgvResults, setBgvResults] = useState<Record<string, BGVResult>>({});
  const [lastExecution, setLastExecution] = useState<ActionExecution | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<ExecutionArtifactKey>("email");
  const [copyStatus, setCopyStatus] = useState("");
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [guideMessages, setGuideMessages] = useState<GuideMessage[]>([
    {
      role: "assistant",
      content:
        "I can see the account workspace. Pick an account, open the source tabs, then run the planner after adding new context.",
    },
  ]);
  const [guideInput, setGuideInput] = useState("What should I do next on this screen?");
  const [isGuideLoading, setIsGuideLoading] = useState(false);

  useEffect(() => {
    getDashboardState(accountId).then((data) => {
      setState(data);
      setDailyStates((current) => ({ ...current, [data.account.id]: data }));
      setInteraction(data.demoInteraction);
      setRun(null);
      const firstRec = data.recommendations[0] ?? null;
      setSelected(firstRec);
      setLastExecution(null);
      setSelectedLedgerId(null);
    });
  }, [accountId]);

  const accountIds = useMemo(() => state.accounts.map((item) => item.id).join("|"), [state.accounts]);

  useEffect(() => {
    let cancelled = false;
    const accounts = state.accounts;
    Promise.all(accounts.map((item) => getDashboardState(item.id))).then((items) => {
      if (cancelled) return;
      setDailyStates(Object.fromEntries(items.map((item) => [item.account.id, item])));
    });
    return () => {
      cancelled = true;
    };
  }, [accountIds, state.accounts]);

  const account = state.account;
  const sources = state.sources ?? emptySources();
  const recommendations = useMemo(() => {
    const raw = run?.account_id === account.id && run.recommendations.length ? run.recommendations : state.recommendations;
    const seen = new Set<string>();
    return raw
      .filter((item) => {
        const key = `${item.title}-${item.action}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [account.id, run, state.recommendations]);
  const activeSelected = selected && selected.account_id === account.id ? selected : recommendations[0] ?? null;
  const trace = run?.account_id === account.id ? run.agent_trace : [];
  const displayMemory = state.memory;
  const activeExecution =
    activeSelected && lastExecution && (!lastExecution.recommendation_id || lastExecution.recommendation_id === activeSelected.id)
      ? lastExecution
      : null;

  const navItems = useMemo(() => {
    const base: Array<{ id: ActiveView; label: string; icon: typeof BriefcaseBusiness }> = [
      { id: "today", label: "Today", icon: CalendarDays },
      { id: "accounts", label: "Accounts", icon: Building2 },
      { id: "dashboard", label: "Dashboard", icon: ClipboardList },
      { id: "crm", label: "CRM", icon: BriefcaseBusiness },
      { id: "interactions", label: "Meetings & Mail", icon: Mail },
      { id: "knowledge", label: "Knowledge", icon: BookOpen },
      { id: "risks", label: "Risks", icon: ShieldAlert },
    ];
    if (account.supports_candidates) {
      base.push({ id: "candidates", label: "Candidates/BGV", icon: Users });
    }
    base.push(
      { id: "memory", label: "Memory", icon: Database },
      { id: "execution", label: "Execution", icon: BadgeCheck },
      { id: "trace", label: "Trace", icon: Activity },
    );
    return base;
  }, [account.supports_candidates]);

  async function refreshAccount(targetId = account.id) {
    const nextState = await getDashboardState(targetId);
    setState(nextState);
    setInteraction(nextState.demoInteraction);
    setSelected(nextState.recommendations[0] ?? null);
  }

  function chooseAccount(next: AccountSummary) {
    setAccountId(next.id);
    setActiveView("dashboard");
  }

  function openAccountView(next: AccountSummary, view: ActiveView = "dashboard") {
    setAccountId(next.id);
    setActiveView(view);
  }

  async function handleRunPlanner() {
    setIsRunning(true);
    const result = await runPlanner(account.id, interaction);
    setRun(result);
    setSelected(result.recommendations[0] ?? null);
    setActiveView("dashboard");
    setIsRunning(false);
  }

  async function handleReview(decision: "approved" | "rejected") {
    if (!activeSelected) return;
    const response = await reviewRecommendation(activeSelected.id, decision);
    const execution = (response as { action_execution?: ActionExecution }).action_execution ?? null;
    setLastExecution(execution);
    const update = (item: Recommendation) => (item.id === activeSelected.id ? { ...item, status: decision } : item);
    setSelected({ ...activeSelected, status: decision });
    setState((current) => ({
      ...current,
      recommendations: current.recommendations.map(update),
      memory: [
        {
          id: `mem-feedback-${activeSelected.id}`,
          entity_type: "account",
          entity_id: account.id,
          title: decision === "approved" ? "Approved Action" : "Rejected Action",
          memory_type: "episodic",
          summary:
            decision === "approved"
              ? `Approved '${activeSelected.title}'. A queued execution draft was created for ${activeSelected.owner_role}.`
              : `Rejected '${activeSelected.title}'. Future runs should avoid similar recommendations unless stronger evidence appears.`,
          confidence: 93,
          updated_at: new Date().toISOString(),
        },
        ...current.memory,
      ],
    }));
    if (decision === "approved") {
      setActiveArtifact("email");
      setActiveView("execution");
    }
  }

  function draftFor(collection: SourceCollection) {
    return (
      drafts[collection] ?? {
        title: "",
        content: "",
        fields: Object.fromEntries(fieldSpecs[collection].map((field) => [field.key, ""])),
      }
    );
  }

  function updateDraft(collection: SourceCollection, next: Partial<{ title: string; content: string; fields: Record<string, string> }>) {
    setDrafts((current) => ({ ...current, [collection]: { ...draftFor(collection), ...next } }));
  }

  function pendingKey(collection: SourceCollection) {
    return `${account.id}:${collection}`;
  }

  function pendingSamplesFor(collection: SourceCollection) {
    const existingTitles = new Set((sources[collection] ?? []).map((entry) => entry.title));
    return (pendingSourceSamples[account.id]?.[collection] ?? []).filter(
      (sample) => !ingestedPendingIds[sample.id] && !existingTitles.has(sample.title),
    );
  }

  function loadPendingSample(collection: SourceCollection, sample: PendingSourceSample) {
    const fields = Object.fromEntries(fieldSpecs[collection].map((field) => [field.key, stringifyField(sample.fields[field.key])]));
    Object.entries(sample.fields).forEach(([key, value]) => {
      fields[key] = stringifyField(value);
    });
    updateDraft(collection, {
      title: sample.title,
      content: sample.content,
      fields,
    });
    setLoadedPendingIds((current) => ({ ...current, [pendingKey(collection)]: sample.id }));
    setUploadStatus((current) => ({ ...current, [collection]: "Sample loaded" }));
  }

  async function submitSource(collection: SourceCollection) {
    const draft = draftFor(collection);
    if (!draft.title.trim() || !draft.content.trim()) return;
    const activePendingId = loadedPendingIds[pendingKey(collection)];
    const activePending = pendingSourceSamples[account.id]?.[collection]?.find((sample) => sample.id === activePendingId);
    const payload = {
      account_id: account.id,
      collection,
      source_type: activePending?.source_type ?? sourceTypeFor(collection),
      title: draft.title,
      content: draft.content,
      fields: draft.fields,
    };
    const created = await createSourceEntry(payload).catch(() => null);
    const newEntry = created?.entry ?? {
      id: `local-${collection}-${Date.now()}`,
      account_id: account.id,
      collection,
      source_type: payload.source_type,
      title: draft.title,
      content: draft.content,
      fields: draft.fields,
      created_at: new Date().toISOString(),
    };
    setState((current) => ({
      ...current,
      sources: {
        ...current.sources,
        [collection]: [newEntry, ...(current.sources?.[collection] ?? [])],
      },
      candidates:
        collection === "candidates"
          ? [
              {
                id: String(newEntry.fields.candidate_id || newEntry.id.replace(/^src-/, "cand-").replace(/^local-/, "cand-")),
                account_id: account.id,
                name: stringifyField(newEntry.fields.name || newEntry.title.replace("Candidate Profile - ", "")),
                role: stringifyField(newEntry.fields.role || "Candidate"),
                availability_date: stringifyField(newEntry.fields.availability_date || ""),
                credentialing_status: stringifyField(newEntry.fields.credentialing_status || "unknown"),
                bgv_status: stringifyField(newEntry.fields.bgv_status || "not_started"),
                fit_score: Number(newEntry.fields.fit_score || 70),
                rate_variance_percent: Number(newEntry.fields.rate_variance_percent || 0),
                missing_items: splitListField(newEntry.fields.missing_items),
                risk_flags: splitListField(newEntry.fields.risk_flags),
                metadata: newEntry.fields,
              },
              ...current.candidates.filter(
                (candidate) =>
                  candidate.name !== stringifyField(newEntry.fields.name || newEntry.title.replace("Candidate Profile - ", "")),
              ),
            ]
          : current.candidates,
      memory: [
        {
          id: `mem-${newEntry.id}`,
          entity_type: "account",
          entity_id: account.id,
          title: newEntry.title,
          memory_type: collection === "knowledge" ? "rule" : collection === "risks" ? "episodic" : collection === "crm" ? "profile" : "raw",
          summary: newEntry.content.slice(0, 360),
          confidence: 86,
          updated_at: new Date().toISOString(),
        },
        ...current.memory,
      ],
    }));
    if (activePendingId) {
      setIngestedPendingIds((current) => ({ ...current, [activePendingId]: true }));
      setLoadedPendingIds((current) => {
        const next = { ...current };
        delete next[pendingKey(collection)];
        return next;
      });
    }
    updateDraft(collection, {
      title: "",
      content: "",
      fields: Object.fromEntries(fieldSpecs[collection].map((field) => [field.key, ""])),
    });
  }

  async function handleUpload(collection: SourceCollection, file?: File) {
    if (!file) return;
    setUploadStatus((current) => ({ ...current, [collection]: "Uploading" }));
    try {
      await uploadDocument(file, account.id, collection, sourceTypeFor(collection));
      setUploadStatus((current) => ({ ...current, [collection]: "Indexed into memory" }));
      await refreshAccount(account.id);
    } catch {
      setUploadStatus((current) => ({ ...current, [collection]: "Backend offline" }));
    }
  }

  async function handleBGV(candidate: CandidateProfile) {
    const result = await runBGV(account.id, candidate.id);
    setBgvResults((current) => ({ ...current, [candidate.id]: result }));
  }

  async function copyArtifact(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1400);
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(""), 1400);
    }
  }

  async function sendGuide() {
    const question = guideInput.trim();
    if (!question) return;
    const nextMessages: GuideMessage[] = [...guideMessages, { role: "user", content: question }];
    setGuideMessages(nextMessages);
    setGuideInput("");
    setIsGuideLoading(true);
    const response = await guideChat({
      account_id: account.id,
      current_view: activeView,
      visible_context: {
        account: account.name,
        current_screen: viewLabels[activeView],
        available_navigation: navItems.map((item) => item.label),
        visible_buttons: [
          activeView === "today" ? "Accounts" : "Switch Account",
          activeView === "today" ? "Current Dashboard" : "Run Planner",
          ...(activeView === "today" ? ["Open top priority", "Open account next step"] : []),
          ...(activeView === "dashboard" ? ["Approve selected action", "Reject selected action"] : []),
          ...(activeView === "execution" ? ["Approve and generate artifacts", "Copy artifact", "Open Memory Ledger"] : []),
          ...(activeView === "crm" || activeView === "interactions" || activeView === "knowledge" || activeView === "risks" || activeView === "candidates"
            ? ["Load sample", "Save and ingest to memory", "Upload file"]
            : []),
          ...(activeView === "memory" ? ["Open Memory Ledger", "Inspect trust state"] : []),
        ],
        visible_sections:
          activeView === "today"
            ? ["Daily Command Brief", "Ranked Account Briefs", "One-Click Work Queue", "Automation Logic"]
            : activeView === "dashboard"
            ? ["Metrics", "Recommendation Inbox", "Agent Decision Flow", "Risk Trend"]
            : activeView === "memory"
              ? ["Memory Graph", "Memory Sources", "Memory Ledger", "Memory Cards", "Evidence For Selected Action"]
              : activeView === "execution"
                ? ["Approval Execution Studio", "Generated Artifacts", "Execution Timeline", "Memory Writeback"]
                : activeView === "trace"
                  ? ["Agent Trace", "Retrieved Evidence", "Run Summary"]
                  : activeView === "accounts"
                    ? ["Account Switcher"]
                    : [sourceLabels[activeView as SourceCollection]?.title ?? viewLabels[activeView], "Add New Entry", "Existing Entries"],
        visible_recommendations: recommendations.slice(0, 5).map((item) => ({
          title: item.title,
          priority: item.priority,
          owner: item.owner_role,
          due: item.due_date,
          confidence: item.confidence,
        })),
        selected_recommendation: activeSelected
          ? {
              title: activeSelected.title,
              priority: activeSelected.priority,
              owner: activeSelected.owner_role,
              due: activeSelected.due_date,
              evidence_titles: activeSelected.evidence.slice(0, 4).map((item) => item.source_title),
            }
          : null,
        source_counts: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, value.length])),
        visible_source_titles: Object.fromEntries(
          Object.entries(sources).map(([key, value]) => [key, value.slice(0, 4).map((entry) => entry.title)]),
        ),
        visible_metrics: state.metrics,
        candidate_names: state.candidates.slice(0, 6).map((candidate) => candidate.name),
        rule: "Use this visible_context as the only source of truth for UI navigation and button names.",
      },
      messages: nextMessages,
      question,
    });
    setGuideMessages((current) => [...current, { role: "assistant", content: response.answer }]);
    setIsGuideLoading(false);
  }

  function todayView() {
    const briefs = state.accounts
      .map(
        (item) =>
          dailyStates[item.id] ?? {
            ...fallbackDashboardState,
            accounts: state.accounts,
            account: item,
            recommendations: [],
            memory: [],
            sources: emptySources(),
            candidates: [],
            metrics: item.metrics,
            riskTrend: item.risk_trend,
            demoInteraction: item.description,
            mode: state.mode,
          },
      )
      .map(buildDailyBrief)
      .sort((a, b) => b.score - a.score);
    const topBrief = briefs[0];
    const openGaps = briefs.filter((brief) => !brief.missing.startsWith("No major")).length;
    const urgentActions = briefs.filter((brief) => brief.level === "Critical" || brief.level === "High").length;

    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-lg border border-black/10 bg-[#101319] text-white shadow-sm">
          <div
            className="relative p-5 md:p-6"
            style={{
              backgroundImage:
                "radial-gradient(circle at 16% 0%, rgba(34,211,238,0.2), transparent 30%), radial-gradient(circle at 88% 12%, rgba(99,102,241,0.22), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.08), transparent)",
            }}
          >
            <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan-200">Daily Command Brief</p>
                <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal md:text-4xl">
                  Flow360 scanned every account. Start with the highest business risk.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                  Ranked by account health, urgent recommendations, missing context, source freshness, and operational blockers.
                </p>
              </div>
              <button
                onClick={() => topBrief && openAccountView(topBrief.account, topBrief.nextView)}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-black hover:bg-white/90"
              >
                Open top priority
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="relative z-10 mt-6 grid gap-3 md:grid-cols-3">
              {[
                ["Accounts scanned", String(briefs.length), "same reusable workflow"],
                ["Needs attention", String(urgentActions), "critical/high briefs"],
                ["Context gaps", String(openGaps), "missing data before confidence rises"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                  <p className="text-xs font-medium uppercase text-white/42">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-white/46">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-3">
            {briefs.map((brief, index) => (
              <article key={brief.account.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <p className="text-xs font-semibold uppercase text-indigo-700">{brief.account.segment}</p>
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                          brief.level === "Critical"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : brief.level === "High"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : brief.level === "Watch"
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {brief.level}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-normal">{brief.account.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/60">{brief.actionTitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase text-black/42">Focus score</p>
                      <p className="text-3xl font-semibold">{brief.score}</p>
                    </div>
                    <button
                      onClick={() => openAccountView(brief.account, brief.nextView)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white hover:bg-black/85"
                    >
                      {brief.nextLabel}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-md bg-[#f7f6f3] p-3">
                    <p className="text-xs font-semibold uppercase text-black/42">Why today</p>
                    <p className="mt-2 text-sm leading-6 text-black/65">{brief.reason}</p>
                  </div>
                  <div className="rounded-md bg-[#f7f6f3] p-3">
                    <p className="text-xs font-semibold uppercase text-black/42">Changed recently</p>
                    <p className="mt-2 text-sm leading-6 text-black/65">{brief.changed}</p>
                  </div>
                  <div className="rounded-md bg-[#f7f6f3] p-3">
                    <p className="text-xs font-semibold uppercase text-black/42">Missing before confidence rises</p>
                    <p className="mt-2 text-sm leading-6 text-black/65">{brief.missing}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {brief.signals.map((signal) => (
                    <span key={signal} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-black/55 ring-1 ring-black/8">
                      {signal}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-3">
            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                <h2 className="text-lg font-semibold tracking-normal">One-Click Work Queue</h2>
              </div>
              <div className="mt-3 space-y-2">
                {briefs.slice(0, 4).map((brief) => (
                  <button
                    key={brief.account.id}
                    onClick={() => openAccountView(brief.account, brief.nextView)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-black/10 bg-[#fbfaf8] p-3 text-left hover:bg-black/[0.035]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{brief.account.name}</span>
                      <span className="mt-1 block truncate text-xs text-black/52">{brief.nextLabel}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-black/38" />
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-black/10 bg-[#111111] p-4 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-cyan-300" />
                <h2 className="text-lg font-semibold tracking-normal">Automation Logic</h2>
              </div>
              <div className="mt-3 space-y-3 text-sm leading-6 text-white/62">
                <p>Flow360 ranks work before the user asks a question.</p>
                <p>It checks account health, recommendation severity, missing sources, memory coverage, and candidate blockers.</p>
                <p>The user gets one next click instead of hunting across CRM, meetings, risks, memory, and planner screens.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  function accountCards() {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        {state.accounts.map((item) => (
          <button
            key={item.id}
            onClick={() => chooseAccount(item)}
            className={`rounded-lg border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              item.id === account.id ? "border-indigo-300 ring-2 ring-indigo-100" : "border-black/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-indigo-700">{item.segment}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-normal">{item.name}</h2>
              </div>
              <span className="rounded-md bg-black px-2 py-1 text-xs font-semibold text-white">{item.health}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-black/60">{item.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {item.metrics.slice(0, 4).map((metric) => (
                <div key={metric.label} className="rounded-md bg-[#f7f6f3] p-3">
                  <p className="text-xs text-black/45">{metric.label}</p>
                  <p className="mt-1 font-semibold">{metric.value}</p>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    );
  }

  function recommendationInbox() {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">Recommendation Inbox</h2>
            <p className="text-sm text-black/55">{recommendations.length} ranked actions for {account.name}</p>
          </div>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Human review required
          </span>
        </div>
        <div className="mt-4 divide-y divide-black/8">
          {recommendations.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`grid w-full gap-3 py-4 text-left transition sm:grid-cols-[1fr_24px] sm:items-center ${
                activeSelected?.id === item.id ? "bg-indigo-50/70 px-3" : "hover:bg-black/[0.025]"
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold leading-6 tracking-normal text-black">{item.title}</h3>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityClass[item.priority]}`}>
                    {item.priority}
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-black/50 ring-1 ring-black/8">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/58">{item.action}</p>
              </div>
              <ChevronRight size={18} className="hidden text-black/38 md:block" />
            </button>
          ))}
          {!recommendations.length && (
            <div className="rounded-lg bg-[#f7f6f3] p-5 text-sm text-black/58">
              No recommendations yet. Add source context or click Run Planner.
            </div>
          )}
        </div>
      </section>
    );
  }

  function selectedAction() {
    if (!activeSelected) {
      return (
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">No selected action</h2>
          <p className="mt-2 text-sm text-black/55">Run the planner to generate account-specific next best actions.</p>
        </section>
      );
    }
    return (
      <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-black/45">Selected Action</p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">{activeSelected.title}</h2>
          </div>
          <span className="rounded-md bg-black px-3 py-1 text-sm font-semibold text-white">{activeSelected.confidence}%</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-black/64">{activeSelected.rationale}</p>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-md bg-[#f7f6f3] px-3 py-2">
            <span className="text-black/48">Owner</span>
            <span className="font-medium">{activeSelected.owner_role}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-[#f7f6f3] px-3 py-2">
            <span className="text-black/48">Due</span>
            <span className="font-medium">{activeSelected.due_date}</span>
          </div>
          <div className="rounded-md bg-[#f7f6f3] px-3 py-2">
            <span className="text-black/48">Metric</span>
            <p className="mt-1 font-medium">{activeSelected.business_metric}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleReview("approved")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Check size={16} />
            Approve
          </button>
          <button
            onClick={() => handleReview("rejected")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-black/10 text-sm font-semibold hover:bg-black/5"
          >
            <X size={16} />
            Reject
          </button>
        </div>
        {activeExecution && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p className="font-semibold">Execution artifacts are ready.</p>
            <p className="mt-1">Open Execution Studio to copy the email, CRM task, escalation note, SLA update, or summary.</p>
            <button
              onClick={() => setActiveView("execution")}
              className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Open Execution Studio
            </button>
          </div>
        )}
      </section>
    );
  }

  function executionStudioView() {
    if (!activeSelected) {
      return (
        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-normal">Approval Execution Studio</h2>
          <p className="mt-2 text-sm leading-6 text-black/58">
            Run the planner or select a recommendation first. Once a recommendation is selected, this screen turns approval into practical
            artifacts.
          </p>
        </section>
      );
    }

    const approved = activeSelected.status === "approved" || !!activeExecution;
    const artifact = artifactFromExecution(activeExecution, activeArtifact) ?? buildArtifactDraft(account, activeSelected, activeArtifact);
    const evidenceTitles =
      activeExecution?.metadata?.evidence_titles ??
      activeSelected.evidence.map((item) => item.source_title).filter(Boolean).slice(0, 4);
    const nextSteps =
      activeExecution?.next_steps ??
      activeExecution?.metadata?.next_steps ?? [
        `Assign ${activeSelected.owner_role}`,
        `Complete by ${activeSelected.due_date}`,
        "Capture the result as reviewed memory",
      ];

    return (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-indigo-700">Human-in-the-loop</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">Approval Execution Studio</h2>
              <p className="mt-2 text-sm leading-6 text-black/58">
                One approval creates the customer communication, internal task, escalation note, SLA update, and memory writeback.
              </p>
            </div>
            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${approved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {approved ? "Artifacts ready" : "Awaiting approval"}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-black/10 bg-[#fbfaf8] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{activeSelected.title}</h3>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityClass[activeSelected.priority]}`}>
                {activeSelected.priority}
              </span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black/55 ring-1 ring-black/8">
                {activeSelected.confidence}% confidence
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-black/62">{activeSelected.rationale}</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-md bg-white px-3 py-2 ring-1 ring-black/8">
                <span className="text-black/45">Owner</span>
                <p className="font-semibold">{activeSelected.owner_role}</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 ring-1 ring-black/8">
                <span className="text-black/45">Due</span>
                <p className="font-semibold">{activeSelected.due_date}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {[
              ["1", "Recommendation selected", "A business user chooses the next best action."],
              ["2", "Evidence checked", evidenceTitles.length ? evidenceTitles[0] : "No evidence linked yet."],
              ["3", approved ? "Human approval captured" : "Waiting for approval", approved ? "Decision written back to episodic memory." : "Click approve when the recommendation is correct."],
              ["4", approved ? "Execution artifacts generated" : "Artifact preview prepared", "Email, CRM task, escalation note, SLA update, and summary."],
            ].map(([number, title, detail]) => (
              <div key={number} className="grid grid-cols-[30px_1fr] gap-3 rounded-md border border-black/8 bg-white p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-xs font-bold text-white">{number}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-black/52">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleReview("approved")}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-black text-sm font-semibold text-white hover:bg-black/85"
            >
              <Check size={16} />
              {approved ? "Regenerate" : "Approve & Generate"}
            </button>
            <button
              onClick={() => handleReview("rejected")}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-black/10 text-sm font-semibold hover:bg-black/5"
            >
              <X size={16} />
              Reject
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Generated artifacts</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">{artifact.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                These drafts are generated from the selected recommendation, evidence, owner, and due date. Copy the one you need and send it
                through the real business system.
              </p>
            </div>
            <button
              onClick={() => copyArtifact(artifact.body)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-black/10 px-3 text-sm font-semibold hover:bg-black/5"
            >
              <ClipboardList size={15} />
              {copyStatus || "Copy"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {artifactTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveArtifact(tab.key)}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${
                    activeArtifact === tab.key
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-[#fbfaf8] text-black/68 hover:bg-black/5"
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-black/10 bg-[#fbfaf8]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
              <p className="text-sm font-semibold">{approved ? "Ready after approval" : "Preview before approval"}</p>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black/50 ring-1 ring-black/8">
                {activeSelected.owner_role} - {activeSelected.due_date}
              </span>
            </div>
            <pre className="whitespace-pre-wrap p-4 font-sans text-sm leading-6 text-black/72">{artifact.body}</pre>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">Memory writeback</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                {approved
                  ? "This approval is stored as episodic memory, so future recommendations can learn from the human decision."
                  : "Approval will create episodic memory and mark these artifacts as reviewed output."}
              </p>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="text-sm font-semibold">Next steps</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-black/60">
                {nextSteps.map((step) => (
                  <li key={step} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function dashboardView() {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {state.metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-black/45">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-normal">{metric.value}</p>
              <p className="mt-1 text-xs text-black/48">{metric.delta}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          {recommendationInbox()}
          <aside className="space-y-4">
            {selectedAction()}
            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold tracking-normal">Risk And Confidence</h2>
              <div className="mt-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={state.riskTrend} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="#e7e5df" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="linear" dataKey="risk" stroke="#f43f5e" strokeWidth={3} dot={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="confidence" stroke="#4f46e5" strokeWidth={3} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  function sourcePage(collection: SourceCollection) {
    const config = sourceLabels[collection];
    const Icon = config.icon;
    const entries = sources[collection] ?? [];
    const draft = draftFor(collection);
    const pendingSamples = pendingSamplesFor(collection);
    return (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                <Icon size={19} />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-normal">{config.title}</h2>
                <p className="text-sm text-black/55">{config.subtitle}</p>
              </div>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-medium hover:bg-black/5">
              <Upload size={16} />
              <span>{uploadStatus[collection] ?? "Upload doc"}</span>
              <input type="file" className="sr-only" onChange={(event) => handleUpload(collection, event.target.files?.[0])} />
            </label>
          </div>
          {pendingSamples.length > 0 && (
            <div className="mt-3 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Pending import queue</p>
                  <p className="text-xs text-indigo-700/70">These records are visible here but not in memory until you load and save them.</p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  {pendingSamples.length} not ingested
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {pendingSamples.map((sample) => (
                  <article key={sample.id} className="rounded-md border border-indigo-100 bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{sample.title}</h3>
                          <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                            not in memory yet
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/58">{sample.content}</p>
                        <p className="mt-2 text-xs font-medium text-indigo-700">{sample.ingest_hint}</p>
                      </div>
                      <button
                        onClick={() => loadPendingSample(collection, sample)}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Load sample
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 grid gap-2">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-md border border-black/10 bg-[#fbfaf8] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{entry.title}</h3>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-black/50 ring-1 ring-black/8">
                    {entry.source_type}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/62">{entry.content}</p>
                {!!Object.keys(entry.fields ?? {}).length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(entry.fields).slice(0, 4).map(([key, value]) => (
                      <span key={key} className="rounded-md bg-white px-2 py-1 text-xs text-black/55 ring-1 ring-black/8">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal">Add New {config.title}</h2>
          <p className="mt-1 text-sm text-black/55">Saving this entry immediately ingests it into Flow360 memory.</p>
          <input
            value={draft.title}
            onChange={(event) => updateDraft(collection, { title: event.target.value })}
            placeholder="Title"
            className="mt-3 h-9 w-full rounded-md border border-black/10 bg-[#fbfaf8] px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {fieldSpecs[collection].map((field) => (
              <label key={field.key} className="text-xs font-medium text-black/55">
                {field.label}
                <input
                  value={draft.fields[field.key] ?? ""}
                  onChange={(event) => updateDraft(collection, { fields: { ...draft.fields, [field.key]: event.target.value } })}
                  placeholder={field.placeholder}
                  className="mt-1 h-9 w-full rounded-md border border-black/10 bg-[#fbfaf8] px-2 text-sm font-normal text-black outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            ))}
          </div>
          <textarea
            value={draft.content}
            onChange={(event) => updateDraft(collection, { content: event.target.value })}
            placeholder="Paste the CRM note, email, meeting note, policy, RCA, or candidate detail here."
            className="mt-3 min-h-[140px] w-full resize-none rounded-lg border border-black/10 bg-[#fbfaf8] p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={() => submitSource(collection)}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white hover:bg-black/85"
          >
            <Database size={16} />
            Save And Ingest To Memory
          </button>
        </aside>
      </div>
    );
  }

  function candidatesView() {
    const collection: SourceCollection = "candidates";
    const draft = draftFor(collection);
    const pendingSamples = pendingSamplesFor(collection);
    return (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <SearchCheck size={18} className="text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold tracking-normal">Candidate BGV And Credentialing</h2>
                <p className="text-sm text-black/55">Applicable only when decisions are about individual people.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-[#f7f6f3] px-2 py-1 font-medium">{state.candidates.length} candidates</span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                {state.candidates.filter((candidate) => candidate.bgv_status === "verified").length} verified
              </span>
              <span className="rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700">
                {state.candidates.filter((candidate) => candidate.missing_items.length > 0).length} blockers
              </span>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-md border border-black/10">
            <div className="grid grid-cols-[1.1fr_0.9fr_0.8fr_0.7fr_120px] bg-[#f7f6f3] px-3 py-2 text-xs font-semibold uppercase text-black/45">
              <span>Candidate</span>
              <span>Credentialing</span>
              <span>BGV</span>
              <span>Fit</span>
              <span className="text-right">Action</span>
            </div>
            {state.candidates.map((candidate) => {
              const result = bgvResults[candidate.id];
              return (
                <article key={candidate.id} className="border-t border-black/8 bg-white px-3 py-3">
                  <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr_0.8fr_0.7fr_120px] md:items-center">
                    <div>
                      <h3 className="text-sm font-semibold">{candidate.name}</h3>
                      <p className="mt-1 text-xs text-black/52">{candidate.role} - available {candidate.availability_date}</p>
                    </div>
                    <span className="rounded-md bg-[#fbfaf8] px-2 py-1 text-xs text-black/62 ring-1 ring-black/8">
                      {candidate.credentialing_status}
                    </span>
                    <span className="rounded-md bg-[#fbfaf8] px-2 py-1 text-xs text-black/62 ring-1 ring-black/8">
                      {candidate.bgv_status}
                    </span>
                    <span className="text-sm font-semibold">{candidate.fit_score}%</span>
                    <button
                      onClick={() => handleBGV(candidate)}
                      className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <SearchCheck size={15} />
                      Run BGV
                    </button>
                  </div>
                  {(candidate.missing_items.length > 0 || candidate.risk_flags.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {candidate.missing_items.map((item) => (
                        <span key={item} className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 ring-1 ring-rose-100">
                          {item}
                        </span>
                      ))}
                      {candidate.risk_flags.map((item) => (
                        <span key={item} className="rounded-md bg-amber-50 px-2 py-1 text-amber-700 ring-1 ring-amber-100">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {result && (
                    <div
                      className={`mt-2 rounded-md border px-3 py-2 text-xs ${
                        result.status === "blocked"
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : result.status === "verified"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <p className="font-semibold">
                        {result.status} - {result.score}% confidence
                      </p>
                      <p className="mt-1 leading-5">{result.summary}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-normal">Add Candidate</h2>
              <p className="text-xs text-black/52">Save to candidate memory and BGV context.</p>
            </div>
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-black/10 px-2 text-xs font-medium hover:bg-black/5">
              <Upload size={14} />
              <span>{uploadStatus[collection] ?? "Upload"}</span>
              <input type="file" className="sr-only" onChange={(event) => handleUpload(collection, event.target.files?.[0])} />
            </label>
          </div>

          {pendingSamples.length > 0 && (
            <div className="mt-3 rounded-md border border-dashed border-indigo-200 bg-indigo-50/70 p-2">
              <p className="text-xs font-semibold uppercase text-indigo-700">Pending import</p>
              {pendingSamples.slice(0, 2).map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => loadPendingSample(collection, sample)}
                  className="mt-2 w-full rounded-md bg-white p-2 text-left text-xs ring-1 ring-indigo-100 hover:bg-indigo-50"
                >
                  <span className="font-semibold">{sample.title}</span>
                  <span className="mt-1 block line-clamp-2 text-black/55">{sample.content}</span>
                </button>
              ))}
            </div>
          )}

          <input
            value={draft.title}
            onChange={(event) => updateDraft(collection, { title: event.target.value })}
            placeholder="Candidate Profile - Nikhil Bhat"
            className="mt-3 h-9 w-full rounded-md border border-black/10 bg-[#fbfaf8] px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {fieldSpecs[collection].map((field) => (
              <label key={field.key} className="text-xs font-medium text-black/55">
                {field.label}
                <input
                  value={draft.fields[field.key] ?? ""}
                  onChange={(event) => updateDraft(collection, { fields: { ...draft.fields, [field.key]: event.target.value } })}
                  placeholder={field.placeholder}
                  className="mt-1 h-8 w-full rounded-md border border-black/10 bg-[#fbfaf8] px-2 text-xs font-normal text-black outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            ))}
          </div>
          <textarea
            value={draft.content}
            onChange={(event) => updateDraft(collection, { content: event.target.value })}
            placeholder="Paste candidate summary, credentialing notes, BGV status, missing items, and rate details."
            className="mt-3 min-h-[120px] w-full resize-none rounded-lg border border-black/10 bg-[#fbfaf8] p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={() => submitSource(collection)}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white hover:bg-black/85"
          >
            <Database size={15} />
            Save And Ingest
          </button>
        </aside>
      </div>
    );
  }

  function memoryView() {
    const sourceGraphNodes = [
      {
        id: "crm",
        label: "CRM",
        detail: "account, stakeholders, renewal",
        count: sources.crm.length,
        tone: "profile",
      },
      {
        id: "interactions",
        label: "Meetings & Mail",
        detail: "calls, transcripts, emails",
        count: sources.interactions.length,
        tone: "raw",
      },
      {
        id: "knowledge",
        label: "Knowledge Base",
        detail: "policies, playbooks, rate cards",
        count: sources.knowledge.length,
        tone: "rule",
      },
      {
        id: "risks",
        label: "Risks & Incidents",
        detail: "SLA, renewal, RCA memory",
        count: sources.risks.length,
        tone: "episodic",
      },
      {
        id: "candidates",
        label: "Candidates/BGV",
        detail: "profiles, checks, blockers",
        count: sources.candidates.length,
        tone: "profile",
      },
    ].filter((node) => node.count > 0);
    const memoryQuality = Math.round(
      displayMemory.reduce((total, item) => total + item.confidence, 0) / Math.max(displayMemory.length, 1),
    );
    const positions = [
      { left: "18%", top: "22%" },
      { left: "82%", top: "22%" },
      { left: "18%", top: "76%" },
      { left: "82%", top: "76%" },
      { left: "50%", top: "84%" },
    ];
    const ledgerItems = buildMemoryLedgerItems(displayMemory, sources, account);
    const selectedLedger = ledgerItems.find((item) => item.id === selectedLedgerId) ?? ledgerItems[0];
    const trustedCount = ledgerItems.filter((item) => item.state === "fresh" || item.state === "approved").length;
    return (
      <div className="grid min-h-[calc(100vh-128px)] grid-rows-[auto_auto_minmax(300px,1fr)] gap-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-emerald-600" />
                <h2 className="text-lg font-semibold tracking-normal">Memory Graph</h2>
              </div>
              <p className="text-sm text-black/48">Profile, rules, episodes, and source memory connected to this account.</p>
            </div>

            <div
              className="relative mt-3 h-[360px] overflow-hidden rounded-lg border border-white/10 bg-[#101319] text-white"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px), radial-gradient(circle at 50% 42%, rgba(45,212,191,0.22), transparent 34%), radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 28%)",
                backgroundSize: "42px 42px, 42px 42px, 100% 100%, 100% 100%",
              }}
            >
              <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-55" aria-hidden>
                {sourceGraphNodes.map((node, index) => (
                  <line
                    key={node.id}
                    x1="50%"
                    y1="50%"
                    x2={positions[index]?.left ?? "50%"}
                    y2={positions[index]?.top ?? "50%"}
                    stroke="rgba(125,211,252,0.55)"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              <div className="absolute left-1/2 top-1/2 w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-cyan-200/20 bg-white/10 p-4 text-center shadow-[0_0_40px_rgba(45,212,191,0.2)] backdrop-blur">
                <p className="text-xs font-semibold uppercase text-cyan-200">Account Memory</p>
                <h3 className="mt-2 text-lg font-semibold leading-6">{account.name}</h3>
                <p className="mt-2 text-sm leading-5 text-white/58">{Object.values(sources).flat().length} source entries - {memoryQuality}% confidence</p>
              </div>

              {sourceGraphNodes.map((node, index) => (
                <div
                  key={node.id}
                  className={`absolute w-[174px] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-3 shadow-lg backdrop-blur ${
                    node.tone === "profile"
                      ? "border-indigo-200/50 bg-indigo-50 text-indigo-900"
                      : node.tone === "rule"
                        ? "border-emerald-200/60 bg-emerald-50 text-emerald-900"
                        : node.tone === "episodic"
                          ? "border-amber-200/70 bg-amber-50 text-amber-900"
                          : "border-cyan-200/60 bg-cyan-50 text-cyan-900"
                  }`}
                  style={{ left: positions[index]?.left, top: positions[index]?.top }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase">{node.label}</p>
                    <span className="text-xs font-semibold">{node.count}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-5">{node.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-[#111111] p-3 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-cyan-300" />
              <h2 className="text-lg font-semibold tracking-normal">Memory Sources</h2>
            </div>
            <div className="mt-3 grid gap-2">
              {Object.entries(sources).map(([collection, entries]) => (
                <div key={collection} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.06] p-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-cyan-300">
                      {collection === "interactions" ? "meetings/mail" : collection}
                    </p>
                    <p className="mt-1 text-xs text-white/50">connected entries</p>
                  </div>
                  <p className="text-2xl font-semibold">{entries.length}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck size={18} className="text-indigo-600" />
                <h2 className="text-lg font-semibold tracking-normal">Memory Ledger</h2>
              </div>
              <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                {trustedCount} trusted items
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-black/55">
              Audits memory before it influences a recommendation: fresh, stale, contradicted, human-approved, or AI-inferred.
            </p>

            <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
              <div className="min-w-[740px]">
                <div className="grid grid-cols-[1.35fr_0.75fr_0.75fr_0.7fr] bg-[#f7f6f3] px-3 py-2 text-xs font-semibold uppercase text-black/45">
                  <span>Memory</span>
                  <span>Trust state</span>
                  <span>Origin</span>
                  <span>Planner use</span>
                </div>
                {ledgerItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedLedgerId(item.id)}
                    className={`grid w-full grid-cols-[1.35fr_0.75fr_0.75fr_0.7fr] items-center gap-2 border-t border-black/8 px-3 py-3 text-left text-sm transition ${
                      selectedLedger?.id === item.id ? "bg-indigo-50/70" : "bg-white hover:bg-black/[0.025]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.title}</span>
                      <span className="mt-1 block truncate text-xs text-black/45">{item.source}</span>
                    </span>
                    <span className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${ledgerStateStyle[item.state]}`}>
                      {item.stateLabel}
                    </span>
                    <span className="truncate text-black/58">{item.origin}</span>
                    <span className="truncate text-black/58">{item.plannerUse}</span>
                  </button>
                ))}
              </div>
              {!ledgerItems.length && (
                <div className="bg-white p-4 text-sm text-black/55">No memory yet. Add source data or run the planner.</div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            {selectedLedger ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-black/42">Planner trust decision</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-normal">{selectedLedger.title}</h2>
                    <p className="mt-1 text-sm text-black/48">{selectedLedger.trust}% trust</p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${ledgerStateStyle[selectedLedger.state]}`}>
                    {selectedLedger.stateLabel}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="rounded-md bg-[#f7f6f3] p-3">
                    <p className="text-xs font-semibold uppercase text-black/42">Why it matters</p>
                    <p className="mt-2 text-sm leading-6 text-black/65">{selectedLedger.why}</p>
                  </div>
                  <div className="rounded-md bg-[#f7f6f3] p-3">
                    <p className="text-xs font-semibold uppercase text-black/42">Evidence chain</p>
                    <p className="mt-2 text-sm leading-6 text-black/65">{selectedLedger.evidence}</p>
                  </div>
                  <div className="rounded-md bg-[#f7f6f3] p-3">
                    <p className="text-xs font-semibold uppercase text-black/42">Planner rule</p>
                    <p className="mt-2 text-sm leading-6 text-black/65">{selectedLedger.rule}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md bg-[#f7f6f3] p-4 text-sm text-black/55">Select a memory item to inspect its planner rule.</div>
            )}
          </section>
        </div>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="flex min-h-0 flex-col rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold tracking-normal">Memory Cards</h2>
            </div>
            <div className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
              {displayMemory.map((item) => (
                <article key={item.id} className="rounded-md bg-[#f7f6f3] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${memoryTypeStyle[item.memory_type]}`}>
                      {item.memory_type}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-5 text-black/62">{item.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgeCheck size={18} className="text-amber-600" />
              <h2 className="text-lg font-semibold tracking-normal">Evidence For Selected Action</h2>
            </div>
            <div className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
              {(activeSelected?.evidence.length ? activeSelected.evidence : []).map((item) => (
                <article key={`${item.source_id}-${item.snippet}`} className="rounded-md border border-black/10 bg-[#fbfaf8] p-3">
                  <p className="text-sm font-semibold">{item.source_title}</p>
                  <p className="mt-1 text-xs uppercase text-black/42">
                    {item.source_type} - relevance {Math.round(item.relevance * 100)}%
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/62">{item.snippet}</p>
                </article>
              ))}
              {!activeSelected?.evidence.length && (
                <div className="rounded-md bg-[#f7f6f3] p-3 text-sm text-black/58">
                  Select a recommendation to inspect the evidence connected to memory.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function traceView() {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-black/10 bg-[#111111] p-4 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-cyan-300" />
            <h2 className="text-lg font-semibold tracking-normal">Agent Trace</h2>
          </div>
          <div className="mt-4 space-y-4">
            {(trace.length
              ? trace
              : [{ name: "Planner Agent", summary: "Ready to orchestrate source ingestion, retrieval, reasoning, recommendation, and memory." }]
            ).map((step, index) => (
              <div key={`${step.name}-${index}`} className="grid grid-cols-[24px_1fr] gap-3">
                <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.name}</p>
                  <p className="mt-1 text-sm leading-5 text-white/64">{step.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal">Run Status</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-md bg-[#f7f6f3] px-3 py-2">
              <span className="text-black/48">Mode</span>
              <span className="font-medium">{run?.mode ?? state.mode}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-[#f7f6f3] px-3 py-2">
              <span className="text-black/48">Actions</span>
              <span className="font-medium">{recommendations.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-[#f7f6f3] px-3 py-2">
              <span className="text-black/48">Source entries</span>
              <span className="font-medium">{Object.values(sources).flat().length}</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function guidePanel() {
    if (guideCollapsed) {
      return (
        <aside className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setGuideCollapsed(false)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.22)] hover:bg-black/85"
            aria-label="Expand FlowGuide"
            title="Expand FlowGuide"
          >
            <Bot size={17} />
            FlowGuide
            <PanelRightOpen size={15} />
          </button>
        </aside>
      );
    }

    return (
      <aside className="fixed bottom-4 right-4 z-40 flex max-h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
        <div className="border-b border-black/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black text-white">
                <Bot size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold tracking-normal">FlowGuide</h2>
                <p className="truncate text-xs text-black/50">Context-aware demo copilot</p>
              </div>
            </div>
            <button
              onClick={() => setGuideCollapsed(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/10 hover:bg-black/5"
              aria-label="Collapse FlowGuide"
              title="Collapse FlowGuide"
            >
              <PanelRightClose size={17} />
            </button>
          </div>
        </div>
        <div className="max-h-[270px] space-y-2 overflow-y-auto p-3">
          {guideMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg p-3 text-sm leading-6 ${
                message.role === "assistant" ? "bg-[#f4f3f0] text-black/70" : "bg-black text-white"
              }`}
            >
              {message.content}
            </div>
          ))}
          {isGuideLoading && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#f4f3f0] p-3 text-sm text-black/60">
              <Loader2 size={15} className="animate-spin" />
              Thinking with memory
            </div>
          )}
        </div>
        <div className="border-t border-black/10 p-3">
          <textarea
            value={guideInput}
            onChange={(event) => setGuideInput(event.target.value)}
            className="min-h-[72px] w-full resize-none rounded-lg border border-black/10 bg-[#fbfaf8] p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            placeholder="Ask FlowGuide how to use this screen..."
          />
          <button
            onClick={sendGuide}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white hover:bg-black/85"
          >
            {isGuideLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send
          </button>
        </div>
      </aside>
    );
  }

  function activeContent() {
    if (activeView === "accounts") return accountCards();
    if (activeView === "today") return todayView();
    if (activeView === "dashboard") return dashboardView();
    if (activeView === "crm") return sourcePage("crm");
    if (activeView === "interactions") return sourcePage("interactions");
    if (activeView === "knowledge") return sourcePage("knowledge");
    if (activeView === "risks") return sourcePage("risks");
    if (activeView === "candidates" && account.supports_candidates) return candidatesView();
    if (activeView === "memory") return memoryView();
    if (activeView === "execution") return executionStudioView();
    return traceView();
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f3f0] text-[#141414]">
      <div className="flex min-h-screen">
        <aside
          className={`hidden shrink-0 border-r border-black/10 bg-white/82 px-3 py-5 transition-all lg:block ${
            sidebarCollapsed ? "w-[78px]" : "w-[230px]"
          }`}
        >
          <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-black/10 bg-black text-white">
                <Sparkles size={20} />
              </div>
              {!sidebarCollapsed && <span className="font-semibold tracking-normal">Flow360</span>}
            </div>
            <button
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/10 hover:bg-black/5"
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={item.label}
                className={`flex h-11 w-full items-center gap-3 rounded-md border px-3 text-sm font-medium transition ${
                  activeView === item.id
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-transparent text-black/70 hover:border-black/10 hover:bg-black/5"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <item.icon size={19} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-black/10 bg-white/86 px-4 py-3 backdrop-blur md:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-700">
                  {activeView === "today" ? "All accounts" : account.segment}
                </p>
                <h1 className="mt-0.5 text-2xl font-semibold tracking-normal text-black md:text-3xl">
                  {activeView === "today" ? "Flow360 Daily Command Brief" : account.name}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-black/58">
                  {activeView === "today"
                    ? "A ranked morning briefing that tells the team which client needs attention, what changed, what is missing, and where to click next."
                    : account.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveView("accounts")}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/5"
                >
                  <Building2 size={16} />
                  {activeView === "today" ? "Accounts" : "Switch Account"}
                </button>
                <button
                  onClick={activeView === "today" ? () => setActiveView("dashboard") : handleRunPlanner}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white hover:bg-black/85"
                >
                  {activeView === "today" ? (
                    <ClipboardList size={16} />
                  ) : isRunning ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {activeView === "today" ? "Current Dashboard" : "Run Planner"}
                </button>
              </div>
            </div>
          </header>

          <div className="border-b border-black/10 bg-white/70 px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium ${
                    activeView === item.id ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-black/10 bg-white text-black/70"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={activeView === "memory" ? "" : "min-h-[calc(100vh-92px)]"}>
            <div className={`min-w-0 p-3 ${activeView === "memory" ? "pb-6" : "pb-20"}`}>{activeContent()}</div>
          </div>
        </main>
      </div>
      {guidePanel()}
    </div>
  );
}
