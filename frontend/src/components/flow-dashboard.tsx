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
  Brain,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Database,
  FileText,
  Loader2,
  MessageSquare,
  Network,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { askMemory, getDashboardState, reviewRecommendation, runPlanner, uploadDocument } from "@/lib/api";
import { fallbackDashboardState } from "@/lib/demo-data";
import type { AgentRunResult, DashboardState, MemoryQueryResponse, Recommendation } from "@/lib/types";

type ActiveView = "command" | "intake" | "memory" | "trace";

const navItems: Array<{ id: ActiveView; label: string; icon: typeof BriefcaseBusiness }> = [
  { id: "command", label: "Command", icon: BriefcaseBusiness },
  { id: "intake", label: "Intake", icon: Upload },
  { id: "memory", label: "Memory", icon: Database },
  { id: "trace", label: "Trace", icon: Activity },
];

const priorityClass: Record<Recommendation["priority"], string> = {
  critical: "bg-rose-100 text-rose-700 border-rose-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-sky-100 text-sky-700 border-sky-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

const decisionSignals = [
  ["Interactions", "Meeting notes, CFO email, CRM updates"],
  ["Knowledge", "Playbooks, credentialing policy, rate card"],
  ["Memory", "Renewal risk, May SLA incident, stakeholder map"],
];

const memoryTypeStyle = {
  profile: "border-indigo-200 bg-indigo-50 text-indigo-800",
  rule: "border-emerald-200 bg-emerald-50 text-emerald-800",
  episodic: "border-amber-200 bg-amber-50 text-amber-800",
  raw: "border-slate-200 bg-slate-50 text-slate-800",
  semantic: "border-cyan-200 bg-cyan-50 text-cyan-800",
} as const;

export function FlowDashboard() {
  const [state, setState] = useState<DashboardState>(fallbackDashboardState);
  const [run, setRun] = useState<AgentRunResult | null>(null);
  const [selected, setSelected] = useState<Recommendation>(fallbackDashboardState.recommendations[0]);
  const [interaction, setInteraction] = useState(fallbackDashboardState.demoInteraction);
  const [activeView, setActiveView] = useState<ActiveView>("command");
  const [isRunning, setIsRunning] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Upload file");
  const [memoryQuestion, setMemoryQuestion] = useState(
    "What should I remember before approving the selected next best action?",
  );
  const [memoryResponse, setMemoryResponse] = useState<MemoryQueryResponse | null>(null);
  const [isAskingMemory, setIsAskingMemory] = useState(false);

  useEffect(() => {
    getDashboardState().then((data) => {
      setState(data);
      if (data.recommendations.length > 0) {
        setSelected(data.recommendations[0]);
      }
      setInteraction(data.demoInteraction);
    });
  }, []);

  const rawRecommendations = run?.recommendations.length ? run.recommendations : state.recommendations;
  const recommendations = useMemo(() => {
    const seen = new Set<string>();
    return rawRecommendations
      .filter((item) => {
        const key = `${item.title}-${item.action}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [rawRecommendations]);
  const trace = run?.agent_trace ?? [];
  const analysis = run?.analysis ?? {};

  const sourceCount = useMemo(() => {
    const ids = new Set(recommendations.flatMap((item) => item.evidence.map((evidence) => evidence.source_id)));
    return ids.size;
  }, [recommendations]);

  const visibleRecommendations = activeView === "command" ? recommendations.slice(0, 5) : recommendations;
  const selectedConfidence = selected.confidence > 0 ? selected.confidence : 82;
  const displayMemory = useMemo(() => {
    const rank = { profile: 0, rule: 1, episodic: 2, semantic: 3, raw: 4 };
    const seen = new Set<string>();
    return [...state.memory, ...fallbackDashboardState.memory]
      .sort((a, b) => rank[a.memory_type] - rank[b.memory_type])
      .filter((item) => {
        const normalizedTitle = item.title === "Human Review Feedback" ? item.title : `${item.memory_type}-${item.title}`;
        if (seen.has(normalizedTitle)) return false;
        seen.add(normalizedTitle);
        return true;
      });
  }, [state.memory]);

  async function handleRunPlanner() {
    setIsRunning(true);
    const result = await runPlanner(interaction);
    setRun(result);
    if (result.recommendations.length > 0) {
      setSelected(result.recommendations[0]);
    }
    setActiveView("command");
    setIsRunning(false);
  }

  async function handleReview(decision: "approved" | "rejected") {
    await reviewRecommendation(selected.id, decision);
    const update = (item: Recommendation) => (item.id === selected.id ? { ...item, status: decision } : item);
    const feedbackMemory = {
      id: `mem-feedback-${selected.id}`,
      entity_type: "account",
      entity_id: selected.account_id,
      title: "Human Review Feedback",
      memory_type: "episodic" as const,
      summary: `${decision === "approved" ? "Approved" : "Rejected"} recommendation '${selected.title}' during human review.`,
      confidence: 93,
      updated_at: new Date().toISOString(),
    };
    setSelected((current) => ({ ...current, status: decision }));
    setRun((current) =>
      current ? { ...current, recommendations: current.recommendations.map(update) } : current,
    );
    setState((current) => ({
      ...current,
      recommendations: current.recommendations.map(update),
      memory: [feedbackMemory, ...current.memory.filter((item) => item.id !== feedbackMemory.id)],
    }));
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    setUploadStatus("Uploading");
    try {
      const result = await uploadDocument(file);
      setUploadStatus(`${result.chunks_created ?? 0} chunks indexed`);
    } catch {
      setUploadStatus("Backend offline");
    }
  }

  async function handleAskMemory() {
    if (!memoryQuestion.trim()) return;
    setIsAskingMemory(true);
    const response = await askMemory(memoryQuestion);
    setMemoryResponse(response);
    setIsAskingMemory(false);
  }

  function recommendationInbox(title = "Recommendation Inbox") {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
            <p className="text-sm text-black/55">
              {activeView === "command"
                ? `${visibleRecommendations.length} shown from ${recommendations.length} ranked actions`
                : `${recommendations.length} ranked actions from ${sourceCount} evidence sources`}
            </p>
          </div>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Human review required
          </span>
        </div>

        <div className="mt-4 divide-y divide-black/8">
          {visibleRecommendations.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`grid w-full gap-3 py-4 text-left transition sm:grid-cols-[1fr_24px] sm:items-center ${
                selected.id === item.id ? "bg-indigo-50/70 px-3" : "hover:bg-black/[0.025]"
              }`}
            >
              <div>
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <h3 className="max-w-full break-words font-semibold leading-6 tracking-normal text-black [overflow-wrap:anywhere]">
                    {item.title}
                  </h3>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityClass[item.priority]}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 max-w-full break-words text-sm leading-6 text-black/58 [overflow-wrap:anywhere]">
                  {item.action}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-white px-2 py-1 font-medium text-black/58 ring-1 ring-black/8">
                    {item.owner_role}
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 font-semibold text-black ring-1 ring-black/8">
                    {item.due_date}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="hidden text-black/38 md:block" />
            </button>
          ))}
        </div>
      </section>
    );
  }

  function selectedAction() {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-black/45">Selected Action</p>
            <h2 className="mt-2 max-w-full break-words text-xl font-semibold tracking-normal [overflow-wrap:anywhere]">
              {selected.title}
            </h2>
          </div>
          <span className="rounded-md bg-black px-3 py-1 text-sm font-semibold text-white">{selectedConfidence}%</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-black/64">{selected.rationale}</p>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-md bg-[#f7f6f3] px-3 py-2">
            <span className="text-black/48">Owner</span>
            <span className="font-medium">{selected.owner_role}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-[#f7f6f3] px-3 py-2">
            <span className="text-black/48">Due</span>
            <span className="font-medium">{selected.due_date}</span>
          </div>
          <div className="rounded-md bg-[#f7f6f3] px-3 py-2">
            <span className="text-black/48">Metric</span>
            <p className="mt-1 font-medium">{selected.business_metric}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleReview("approved")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check size={16} />
            Approve
          </button>
          <button
            onClick={() => handleReview("rejected")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-black/10 text-sm font-semibold transition hover:bg-black/5"
          >
            <X size={16} />
            Reject
          </button>
        </div>
      </section>
    );
  }

  function agentDecisionFlow() {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Network size={18} className="text-indigo-600" />
          <h2 className="text-lg font-semibold tracking-normal">Agent Decision Flow</h2>
        </div>
        <div className="mt-4 rounded-lg border border-black/10 bg-[#111111] p-4 text-white">
          <div className="grid gap-3">
            {decisionSignals.map(([label, text]) => (
              <div key={label} className="rounded-md border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-semibold uppercase text-cyan-300">{label}</p>
                <p className="mt-1 text-sm leading-5 text-white/72">{text}</p>
              </div>
            ))}
          </div>
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <span className="rounded-md bg-rose-500/14 px-2 py-2 font-semibold text-rose-100">Risk</span>
            <span className="rounded-md bg-indigo-500/18 px-2 py-2 font-semibold text-indigo-100">Reason</span>
            <span className="rounded-md bg-emerald-500/16 px-2 py-2 font-semibold text-emerald-100">Action</span>
          </div>
        </div>
      </section>
    );
  }

  function commandView() {
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
          {recommendationInbox("Top Actions")}
          <aside className="space-y-4">
            {selectedAction()}
            {agentDecisionFlow()}
          </aside>
        </div>
      </div>
    );
  }

  function intakeView() {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-normal">Interaction Intake</h2>
              <p className="text-sm text-black/55">Paste meeting notes or upload context, then run the planner.</p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-black/10 px-3 text-sm font-medium hover:bg-black/5">
              <Upload size={16} />
              <span>{uploadStatus}</span>
              <input type="file" className="sr-only" onChange={(event) => handleUpload(event.target.files?.[0])} />
            </label>
          </div>
          <textarea
            value={interaction}
            onChange={(event) => setInteraction(event.target.value)}
            className="mt-4 min-h-[360px] w-full resize-none rounded-lg border border-black/10 bg-[#fbfaf8] p-4 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={handleRunPlanner}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Send size={16} />
            Analyze Interaction
          </button>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal">Risk And Confidence</h2>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={state.riskTrend} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#e7e5df" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line
                  type="linear"
                  dataKey="risk"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f43f5e" }}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="confidence"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#4f46e5" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 text-sm">
            <p className="rounded-md bg-rose-50 px-3 py-2 text-rose-800">Urgency: {String(analysis.urgency_score ?? 91)}/100</p>
            <p className="rounded-md bg-indigo-50 px-3 py-2 text-indigo-800">Health: {String(analysis.account_health ?? "amber")}</p>
          </div>
        </section>
      </div>
    );
  }

  function memoryGraph() {
    const memoryNodes = displayMemory.slice(0, 4);
    const evidenceSeen = new Set<string>();
    const evidenceNodes = selected.evidence
      .filter((item) => {
        const key = `${item.source_id}-${item.source_title}`;
        if (evidenceSeen.has(key)) return false;
        evidenceSeen.add(key);
        return true;
      })
      .slice(0, 2);
    const nodePositions = [
      { className: "left-[5%] top-[12%]", x: 16, y: 24 },
      { className: "right-[5%] top-[12%]", x: 84, y: 24 },
      { className: "left-[7%] bottom-[13%]", x: 18, y: 76 },
      { className: "right-[7%] bottom-[13%]", x: 82, y: 76 },
      { className: "left-[29%] bottom-[4%]", x: 38, y: 88 },
      { className: "right-[29%] bottom-[4%]", x: 62, y: 88 },
    ];
    const graphNodes = [
      ...memoryNodes.map((item, index) => ({
        id: item.id,
        label: item.title,
        detail: item.memory_type,
        confidence: item.confidence,
        kind: "memory",
        className: nodePositions[index].className,
        x: nodePositions[index].x,
        y: nodePositions[index].y,
        style: memoryTypeStyle[item.memory_type],
      })),
      ...evidenceNodes.map((item, index) => ({
        id: item.source_id,
        label: item.source_title,
        detail: item.source_type,
        confidence: Math.round(item.relevance * 100),
        kind: "evidence",
        className: nodePositions[index + 4].className,
        x: nodePositions[index + 4].x,
        y: nodePositions[index + 4].y,
        style: "border-sky-200 bg-sky-50 text-sky-800",
      })),
    ];

    return (
      <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold tracking-normal">Memory Graph</h2>
          </div>
          <p className="text-sm text-black/50">Profile, rules, episodes, and evidence connected to the account.</p>
        </div>

        <div className="relative mt-4 min-h-[430px] overflow-hidden rounded-lg border border-black/10 bg-[#101114] text-white md:h-[430px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_18%_20%,rgba(99,102,241,0.18),transparent_28%),radial-gradient(circle_at_84%_80%,rgba(16,185,129,0.12),transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <svg className="absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {graphNodes.map((node) => (
              <line
                key={`line-${node.id}`}
                x1="50"
                y1="50"
                x2={node.x}
                y2={node.y}
                stroke="rgba(125,211,252,0.34)"
                strokeWidth="0.45"
              />
            ))}
          </svg>

          <div className="absolute left-1/2 top-1/2 hidden w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cyan-200/30 bg-white/10 p-4 text-center shadow-[0_0_48px_rgba(34,211,238,0.18)] backdrop-blur md:block">
            <p className="text-xs font-semibold uppercase text-cyan-200">Account Memory</p>
            <p className="mt-2 text-lg font-semibold">{state.account.name}</p>
            <p className="mt-2 text-xs leading-5 text-white/56">{state.account.segment} context nucleus</p>
          </div>

          {graphNodes.map((node) => (
            <div
              key={node.id}
              className={`absolute hidden rounded-lg border p-3 shadow-sm md:block ${
                node.kind === "evidence" ? "w-[160px]" : "w-[190px]"
              } ${node.className} ${node.style}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold uppercase">{node.detail}</p>
                <span className="text-xs font-bold">{node.confidence}%</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{node.label}</p>
            </div>
          ))}

          <div className="relative z-10 grid gap-3 p-4 md:hidden">
            <div className="rounded-xl border border-cyan-200/30 bg-white/10 p-4 text-center shadow-[0_0_48px_rgba(34,211,238,0.18)] backdrop-blur">
              <p className="text-xs font-semibold uppercase text-cyan-200">Account Memory</p>
              <p className="mt-2 text-lg font-semibold">{state.account.name}</p>
              <p className="mt-2 text-xs leading-5 text-white/56">{state.account.segment} context nucleus</p>
            </div>
            <div className="grid gap-2">
              {graphNodes.map((node) => (
                <div key={`mobile-${node.id}`} className={`rounded-lg border p-3 shadow-sm ${node.style}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold uppercase">{node.detail}</p>
                    <span className="text-xs font-bold">{node.confidence}%</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{node.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function memoryAskPanel() {
    return (
      <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo-600" />
          <h2 className="text-lg font-semibold tracking-normal">Ask Memory</h2>
        </div>
        <p className="mt-1 text-sm text-black/55">Ask account-history, rule, evidence, or reviewer-feedback questions.</p>
        <textarea
          value={memoryQuestion}
          onChange={(event) => setMemoryQuestion(event.target.value)}
          className="mt-4 min-h-[96px] w-full resize-none rounded-lg border border-black/10 bg-[#fbfaf8] p-3 text-sm leading-6 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          onClick={handleAskMemory}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/82"
        >
          {isAskingMemory ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Ask
        </button>

        <div className="mt-4 rounded-lg border border-black/10 bg-[#f7f6f3] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Memory Answer</p>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black/62 ring-1 ring-black/8">
              {memoryResponse?.confidence ?? 91}% confidence
            </span>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-black/66">
            {memoryResponse?.answer ??
              "Ask a question to summarize account memory, explain why an action matters, or identify what context is missing."}
          </p>
          {!!memoryResponse?.memory_used.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from(
                new Map(memoryResponse.memory_used.map((item) => [`${item.memory_type}-${item.title}`, item])).values(),
              )
                .slice(0, 3)
                .map((item) => (
                <span key={item.id} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-black/58 ring-1 ring-black/8">
                  {item.title}
                </span>
                ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  function memoryView() {
    return (
      <div className="space-y-4">
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          {memoryGraph()}
          {memoryAskPanel()}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold tracking-normal">Memory Cards</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              {displayMemory.map((item) => (
                <div key={item.id} className="rounded-md bg-[#f7f6f3] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${memoryTypeStyle[item.memory_type]}`}>
                      {item.memory_type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-black/62">{item.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-amber-600" />
              <h2 className="text-lg font-semibold tracking-normal">Evidence For Selected Action</h2>
            </div>
            <div className="mt-4 space-y-3">
              {selected.evidence.map((item) => (
                <div key={`${selected.id}-${item.source_id}`} className="border-l-2 border-indigo-300 pl-3">
                  <p className="text-sm font-semibold">{item.source_title}</p>
                  <p className="mt-1 text-xs uppercase text-black/42">
                    {item.source_type} - relevance {Math.round(item.relevance * 100)}%
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/62">{item.snippet}</p>
                </div>
              ))}
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
              : [
                  {
                    name: "Planner Agent",
                    summary: "Ready to orchestrate ingestion, retrieval, analysis, recommendation, and memory.",
                  },
                ]
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

        <aside className="space-y-4">
          {agentDecisionFlow()}
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
                <span className="text-black/48">Evidence sources</span>
                <span className="font-medium">{sourceCount}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f3f0] text-[#141414]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[88px] shrink-0 border-r border-black/10 bg-white/78 px-3 py-5 lg:block">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-md border border-black/10 bg-black text-white">
            <Sparkles size={20} />
          </div>
          <nav className="space-y-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                aria-label={item.label}
                aria-pressed={activeView === item.id}
                title={item.label}
                className={`flex h-12 w-12 items-center justify-center rounded-md border transition ${
                  activeView === item.id
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-transparent bg-transparent text-black hover:border-black/10 hover:bg-black/5"
                }`}
              >
                <item.icon size={20} />
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">
          <header className="flex flex-col gap-4 border-b border-black/10 bg-white/82 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-indigo-700">Flow360 Command Center</p>
              <h1 className="mt-1 max-w-full break-words text-xl font-semibold tracking-normal text-black [overflow-wrap:anywhere] sm:text-3xl">
                {state.account.name}
              </h1>
              <p className="mt-1 max-w-full break-words text-sm leading-6 text-black/58 [overflow-wrap:anywhere] sm:max-w-2xl">
                {state.account.segment} account with planner-led recommendations, evidence, and persistent memory.
              </p>
            </div>
            <button
              onClick={handleRunPlanner}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/82"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              Run Planner
            </button>
          </header>

          <div className="border-b border-black/10 bg-white/68 px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium ${
                    activeView === item.id
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-black/10 bg-white text-black/70"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1440px] p-4">
            {activeView === "command" && commandView()}
            {activeView === "intake" && intakeView()}
            {activeView === "memory" && memoryView()}
            {activeView === "trace" && traceView()}
          </div>
        </main>
      </div>
    </div>
  );
}
