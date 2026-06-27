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
  Recommendation,
  SourceCollection,
  SourceEntry,
} from "@/lib/types";

type ActiveView =
  | "accounts"
  | "dashboard"
  | "crm"
  | "interactions"
  | "knowledge"
  | "risks"
  | "candidates"
  | "memory"
  | "trace";

type FieldSpec = { key: string; label: string; placeholder: string };

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
  accounts: "Accounts",
  dashboard: "Dashboard",
  crm: "CRM",
  interactions: "Meetings & Mail",
  knowledge: "Knowledge",
  risks: "Risks",
  candidates: "Candidates/BGV",
  memory: "Memory",
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

export function FlowDashboard() {
  const [state, setState] = useState<DashboardState>(fallbackDashboardState);
  const [accountId, setAccountId] = useState(fallbackDashboardState.account.id);
  const [activeView, setActiveView] = useState<ActiveView>("accounts");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [guideCollapsed, setGuideCollapsed] = useState(false);
  const [run, setRun] = useState<AgentRunResult | null>(null);
  const [selected, setSelected] = useState<Recommendation | null>(fallbackDashboardState.recommendations[0] ?? null);
  const [interaction, setInteraction] = useState(fallbackDashboardState.demoInteraction);
  const [isRunning, setIsRunning] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, { title: string; content: string; fields: Record<string, string> }>>({});
  const [loadedPendingIds, setLoadedPendingIds] = useState<Record<string, string>>({});
  const [ingestedPendingIds, setIngestedPendingIds] = useState<Record<string, boolean>>({});
  const [bgvResults, setBgvResults] = useState<Record<string, BGVResult>>({});
  const [lastExecution, setLastExecution] = useState<Record<string, unknown> | null>(null);
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
      setInteraction(data.demoInteraction);
      setRun(null);
      const firstRec = data.recommendations[0] ?? null;
      setSelected(firstRec);
    });
  }, [accountId]);

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

  const navItems = useMemo(() => {
    const base: Array<{ id: ActiveView; label: string; icon: typeof BriefcaseBusiness }> = [
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
    base.push({ id: "memory", label: "Memory", icon: Database }, { id: "trace", label: "Trace", icon: Activity });
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
    setLastExecution((response as { action_execution?: Record<string, unknown> }).action_execution ?? null);
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
          "Switch Account",
          "Run Planner",
          ...(activeView === "dashboard" ? ["Approve selected action", "Reject selected action"] : []),
          ...(activeView === "crm" || activeView === "interactions" || activeView === "knowledge" || activeView === "risks" || activeView === "candidates"
            ? ["Load sample", "Save and ingest to memory", "Upload file"]
            : []),
          ...(activeView === "memory" ? ["Ask Memory"] : []),
        ],
        visible_sections:
          activeView === "dashboard"
            ? ["Metrics", "Recommendation Inbox", "Agent Decision Flow", "Risk Trend"]
            : activeView === "memory"
              ? ["Memory Graph", "Memory Sources", "Memory Cards", "Evidence For Selected Action"]
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
        {lastExecution && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Approved action queued. Flow360 created an execution draft and wrote the decision to memory.
          </div>
        )}
      </section>
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
    return (
      <div className="space-y-3">
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
              className="relative mt-3 min-h-[430px] overflow-hidden rounded-lg border border-white/10 bg-[#101319] text-white"
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

        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold tracking-normal">Memory Cards</h2>
            </div>
            <div className="mt-3 grid max-h-[430px] gap-2 overflow-y-auto pr-1">
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

          <section className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <BadgeCheck size={18} className="text-amber-600" />
              <h2 className="text-lg font-semibold tracking-normal">Evidence For Selected Action</h2>
            </div>
            <div className="mt-3 grid gap-2">
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
    if (activeView === "dashboard") return dashboardView();
    if (activeView === "crm") return sourcePage("crm");
    if (activeView === "interactions") return sourcePage("interactions");
    if (activeView === "knowledge") return sourcePage("knowledge");
    if (activeView === "risks") return sourcePage("risks");
    if (activeView === "candidates" && account.supports_candidates) return candidatesView();
    if (activeView === "memory") return memoryView();
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
                <p className="text-sm font-medium text-indigo-700">{account.segment}</p>
                <h1 className="mt-0.5 text-2xl font-semibold tracking-normal text-black md:text-3xl">{account.name}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-black/58">{account.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveView("accounts")}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/5"
                >
                  <Building2 size={16} />
                  Switch Account
                </button>
                <button
                  onClick={handleRunPlanner}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white hover:bg-black/85"
                >
                  {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Run Planner
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

          <div className="min-h-[calc(100vh-92px)]">
            <div className="min-w-0 p-3 pb-20">{activeContent()}</div>
          </div>
        </main>
      </div>
      {guidePanel()}
    </div>
  );
}
