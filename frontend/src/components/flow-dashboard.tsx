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
import { fallbackDashboardState } from "@/lib/demo-data";
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

export function FlowDashboard() {
  const [state, setState] = useState<DashboardState>(fallbackDashboardState);
  const [accountId, setAccountId] = useState(fallbackDashboardState.account.id);
  const [activeView, setActiveView] = useState<ActiveView>("accounts");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [run, setRun] = useState<AgentRunResult | null>(null);
  const [selected, setSelected] = useState<Recommendation | null>(fallbackDashboardState.recommendations[0] ?? null);
  const [interaction, setInteraction] = useState(fallbackDashboardState.demoInteraction);
  const [isRunning, setIsRunning] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, { title: string; content: string; fields: Record<string, string> }>>({});
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

  async function submitSource(collection: SourceCollection) {
    const draft = draftFor(collection);
    if (!draft.title.trim() || !draft.content.trim()) return;
    const payload = {
      account_id: account.id,
      collection,
      source_type: sourceTypeFor(collection),
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
        active_recommendation: activeSelected?.title,
        source_counts: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, value.length])),
        visible_metrics: state.metrics,
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
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
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
          <div className="mt-4 grid gap-3">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-black/10 bg-[#fbfaf8] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{entry.title}</h3>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-black/50 ring-1 ring-black/8">
                    {entry.source_type}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-black/62">{entry.content}</p>
                {!!Object.keys(entry.fields ?? {}).length && (
                  <div className="mt-3 flex flex-wrap gap-2">
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

        <aside className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal">Add New {config.title}</h2>
          <p className="mt-1 text-sm text-black/55">Saving this entry immediately ingests it into Flow360 memory.</p>
          <input
            value={draft.title}
            onChange={(event) => updateDraft(collection, { title: event.target.value })}
            placeholder="Title"
            className="mt-4 h-10 w-full rounded-md border border-black/10 bg-[#fbfaf8] px-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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
            className="mt-3 min-h-[180px] w-full resize-none rounded-lg border border-black/10 bg-[#fbfaf8] p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <SearchCheck size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold tracking-normal">Candidate BGV And Credentialing</h2>
          </div>
          <p className="mt-1 text-sm text-black/55">Applicable only when decisions are about individual people.</p>
          <div className="mt-4 grid gap-3">
            {state.candidates.map((candidate) => {
              const result = bgvResults[candidate.id];
              return (
                <article key={candidate.id} className="rounded-lg border border-black/10 bg-[#fbfaf8] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{candidate.name}</h3>
                      <p className="mt-1 text-sm text-black/55">
                        {candidate.role} - fit {candidate.fit_score}% - rate variance {candidate.rate_variance_percent}%
                      </p>
                    </div>
                    <button
                      onClick={() => handleBGV(candidate)}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      <SearchCheck size={15} />
                      Run BGV
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-white px-2 py-1 ring-1 ring-black/8">
                      Credentialing: {candidate.credentialing_status}
                    </span>
                    <span className="rounded-md bg-white px-2 py-1 ring-1 ring-black/8">BGV: {candidate.bgv_status}</span>
                    <span className="rounded-md bg-white px-2 py-1 ring-1 ring-black/8">Available: {candidate.availability_date}</span>
                  </div>
                  {result && (
                    <div
                      className={`mt-3 rounded-md border p-3 text-sm ${
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
                      <p className="mt-1 leading-6">{result.summary}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        {sourcePage("candidates")}
      </div>
    );
  }

  function memoryView() {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold tracking-normal">Persistent Memory</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {displayMemory.map((item) => (
              <article key={item.id} className="rounded-md bg-[#f7f6f3] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${memoryTypeStyle[item.memory_type]}`}>
                    {item.memory_type}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-black/62">{item.summary}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-black/10 bg-[#111111] p-4 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-cyan-300" />
            <h2 className="text-lg font-semibold tracking-normal">Memory Sources</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {Object.entries(sources).map(([collection, entries]) => (
              <div key={collection} className="rounded-md border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-semibold uppercase text-cyan-300">{collection}</p>
                <p className="mt-1 text-2xl font-semibold">{entries.length}</p>
                <p className="mt-1 text-sm text-white/58">entries connected to account memory</p>
              </div>
            ))}
          </div>
        </section>
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
    return (
      <aside className="flex min-h-0 w-full flex-col border-l border-black/10 bg-white lg:w-[340px] xl:w-[380px]">
        <div className="border-b border-black/10 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-black text-white">
              <Bot size={18} />
            </span>
            <div>
              <h2 className="font-semibold tracking-normal">FlowGuide</h2>
              <p className="text-xs text-black/50">Sees this screen, memory, and evidence</p>
            </div>
          </div>
        </div>
        <div className="min-h-[320px] flex-1 space-y-3 overflow-y-auto p-4">
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
        <div className="border-t border-black/10 p-4">
          <textarea
            value={guideInput}
            onChange={(event) => setGuideInput(event.target.value)}
            className="min-h-[84px] w-full resize-none rounded-lg border border-black/10 bg-[#fbfaf8] p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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
          <header className="border-b border-black/10 bg-white/86 px-4 py-4 backdrop-blur md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-700">{account.segment}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-black md:text-3xl">{account.name}</h1>
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

          <div className="flex min-h-[calc(100vh-105px)] flex-col lg:flex-row">
            <div className="min-w-0 flex-1 p-4">{activeContent()}</div>
            {guidePanel()}
          </div>
        </main>
      </div>
    </div>
  );
}
