from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.agents.workflow import Flow360Workflow
from app.config import get_settings
from app.demo_data import DEMO_ACCOUNT_ID
from app.models import (
    AgentRunRequest,
    BlueprintCreateAccountRequest,
    BlueprintOptionRequest,
    BlueprintSuggestionRequest,
    Evidence,
    GuideChatRequest,
    MemoryCard,
    MemoryQueryRequest,
    RecommendationReviewRequest,
    SourceEntryRequest,
    TextIngestRequest,
)
from app.services.embeddings import EmbeddingService
from app.services.groq_client import GroqRouter
from app.services.store import PlatformStore


settings = get_settings()
embeddings = EmbeddingService(settings)
store = PlatformStore(settings, embeddings)
llm = GroqRouter(settings)
workflow = Flow360Workflow(settings, store, llm)

app = FastAPI(title="Flow360 Workforce Next Best Action API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "mode": "live" if store.live_mode else "demo-fallback",
        "groq_enabled": llm.enabled,
        "supabase_enabled": store.live_mode,
    }


@app.get("/demo/state")
def demo_state(account_id: str = DEMO_ACCOUNT_ID) -> dict:
    return store.dashboard_state(account_id)


@app.get("/accounts")
def list_accounts():
    return {"accounts": [account.model_dump(mode="json") for account in store.list_accounts()]}


@app.post("/accounts")
def create_account(payload: BlueprintCreateAccountRequest):
    return store.create_account_from_blueprint(
        name=payload.name,
        segment=payload.segment,
        domain=payload.domain,
        description=payload.description,
        primary_user=payload.primary_user,
        supports_candidates=payload.supports_candidates,
        account_text=payload.account_text,
        selections=payload.selections,
    )


@app.post("/blueprints/suggest")
def suggest_blueprint(payload: BlueprintSuggestionRequest):
    return _suggest_blueprint(payload)


@app.post("/blueprints/options")
def suggest_blueprint_options(payload: BlueprintOptionRequest):
    return _suggest_blueprint_options(payload)


@app.get("/sources/{account_id}")
def list_sources(account_id: str, collection: str | None = None):
    return {"sources": [entry.model_dump(mode="json") for entry in store.list_source_entries(account_id, collection)]}


@app.post("/sources")
def create_source_entry(payload: SourceEntryRequest):
    return store.ingest_source_entry(
        account_id=payload.account_id,
        collection=payload.collection,
        source_type=payload.source_type,
        title=payload.title,
        content=payload.content,
        fields=payload.fields,
    )


@app.post("/ingest/text")
def ingest_text(payload: TextIngestRequest):
    return store.ingest_text(payload.account_id, payload.title, payload.content, payload.source_type)


@app.post("/ingest/demo")
def ingest_demo():
    return {"documents": [item.model_dump() for item in store.ingest_demo_documents()]}


@app.post("/ingest/upload")
async def ingest_upload(
    file: UploadFile = File(...),
    account_id: str = Form(DEMO_ACCOUNT_ID),
    source_type: str = Form("uploaded_document"),
    collection: str = Form("knowledge"),
):
    content = await file.read()
    text = _extract_text(file.filename or "uploaded-file", content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from uploaded file.")
    return store.ingest_source_entry(
        account_id=account_id,
        collection=collection,
        source_type=source_type,
        title=file.filename or "uploaded-file",
        content=text,
        fields={"filename": file.filename or "uploaded-file"},
    )


@app.post("/agent/run")
def run_agent(payload: AgentRunRequest):
    return workflow.run(payload)


@app.get("/agent/runs/{run_id}")
def get_run(run_id: str):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return run


@app.get("/recommendations")
def list_recommendations(account_id: str | None = None):
    return {"recommendations": store.list_recommendations(account_id)}


@app.get("/intelligence/briefs")
def intelligence_briefs():
    items = [_generate_account_intelligence(account.id) for account in store.list_accounts()]
    return {"mode": "live" if llm.enabled else "demo-fallback", "accounts": items}


@app.get("/intelligence/accounts/{account_id}")
def account_intelligence(account_id: str):
    return _generate_account_intelligence(account_id)


@app.post("/recommendations/{recommendation_id}/review")
def review_recommendation(recommendation_id: str, payload: RecommendationReviewRequest):
    return store.review_recommendation(recommendation_id, payload.decision, payload.reviewer, payload.notes)


@app.get("/candidates/{account_id}")
def list_candidates(account_id: str):
    return {"candidates": [candidate.model_dump(mode="json") for candidate in store.list_candidates(account_id)]}


@app.post("/candidates/{account_id}/{candidate_id}/bgv")
def run_bgv(account_id: str, candidate_id: str):
    return store.run_bgv_check(account_id, candidate_id)


@app.get("/memory/{entity_type}/{entity_id}")
def get_memory(entity_type: str, entity_id: str):
    return {"memory": [item.model_dump(mode="json") for item in store.get_memory(entity_type, entity_id)]}


@app.post("/memory/query")
def query_memory(payload: MemoryQueryRequest):
    memories = store.get_memory(payload.entity_type, payload.entity_id)
    evidence = store.retrieve_context(payload.question, account_id=payload.entity_id, top_k=5)
    answer, confidence, mode = _answer_memory_query(payload.question, memories, evidence)
    return {
        "answer": answer,
        "confidence": confidence,
        "memory_used": [item.model_dump(mode="json") for item in memories[:5]],
        "evidence_used": [item.model_dump(mode="json") for item in evidence[:4]],
        "mode": mode,
    }


@app.post("/guide/chat")
def guide_chat(payload: GuideChatRequest):
    memories = store.get_memory("account", payload.account_id)
    evidence = store.retrieve_context(payload.question, account_id=payload.account_id, top_k=5)
    answer, suggestions, confidence, mode = _answer_guide_query(payload, memories, evidence)
    return {"answer": answer, "suggestions": suggestions, "confidence": confidence, "mode": mode}


def _answer_memory_query(question: str, memories: list[MemoryCard], evidence: list[Evidence]) -> tuple[str, int, str]:
    memory_context = "\n".join(
        f"- {item.memory_type}: {item.title} ({item.confidence}%): {item.summary}" for item in memories[:8]
    )
    evidence_context = "\n".join(
        f"- {item.source_title} [{item.source_type}, relevance {item.relevance:.2f}]: {item.snippet}"
        for item in evidence[:6]
    )
    fallback_context = memory_context or evidence_context or "No persistent memory is available yet."
    fallback = (
        "Based on persistent memory, the account is renewal-sensitive and credentialing risk is the main operational blocker. "
        "Prioritize actions that protect the start date, clarify the approval owner, and record human review feedback so future recommendations improve."
    )
    if fallback_context != "No persistent memory is available yet.":
        first_line = fallback_context.splitlines()[0].lstrip("- ")
        fallback = f"Based on persistent memory, the strongest signal is: {first_line}"

    if not llm.enabled:
        return fallback, 74, "demo-fallback"

    system = (
        "You answer questions for account managers using only the provided persistent memory and evidence. "
        "Be concise, operational, and cite the memory/evidence titles in plain language. "
        "If context is missing, say what is missing and recommend the next data to capture. "
        "Do not mention model providers or implementation details."
    )
    user = f"""Question:
{question}

Persistent memory:
{memory_context or "None"}

Retrieved evidence:
{evidence_context or "None"}

Return a short answer with 2-4 concrete bullets or sentences."""
    result = llm.complete(system=system, user=user, model=settings.groq_fast_model, temperature=0.1, max_tokens=650)
    if not result or not result.content.strip():
        return fallback, 74, "demo-fallback"

    base_confidence = 78
    if memories:
        base_confidence = max(base_confidence, round(sum(item.confidence for item in memories[:5]) / min(len(memories), 5)))
    if evidence:
        base_confidence = min(92, base_confidence + 4)
    return result.content.strip(), base_confidence, "live"


def _answer_guide_query(
    payload: GuideChatRequest, memories: list[MemoryCard], evidence: list[Evidence]
) -> tuple[str, list[str], int, str]:
    account = store.get_account(payload.account_id)
    memory_context = "\n".join(
        f"- {item.memory_type}: {item.title} ({item.confidence}%): {item.summary}" for item in memories[:8]
    )
    evidence_context = "\n".join(
        f"- {item.source_title} [{item.source_type}]: {item.snippet}" for item in evidence[:6]
    )
    visible_context = payload.visible_context or {}
    suggestions = _guide_suggestions(payload.current_view)
    fallback = _screen_grounded_guide(payload, account.name, visible_context) or (
        f"You are viewing {account.name}. Use the visible navigation and buttons on this screen. "
        "If you add CRM, meeting, policy, candidate, or incident data, it is stored as memory first; click Run Planner only when you want fresh recommendations."
    )

    deterministic = _screen_grounded_guide(payload, account.name, visible_context)
    if deterministic:
        return deterministic, suggestions, 84, "demo-fallback"

    if not llm.enabled:
        return fallback, suggestions, 76, "demo-fallback"

    history = "\n".join(f"{message.role}: {message.content}" for message in payload.messages[-8:])
    system = (
        "You are FlowGuide, an in-app assistant for Flow360. "
        "Guide the user through the current screen and explain business terms simply. "
        "The Visible UI context is the only source of truth for navigation, tabs, sections, button names, and what the user can click. "
        "Persistent memory and evidence may explain business context, but they must never override the visible UI. "
        "Do not invent tabs, panels, buttons, or labels. If something is not in Visible UI context, say it is not on this screen. "
        "Be concise, practical, and never mention model providers."
    )
    user = f"""Account:
{account.name} ({account.segment}, {account.domain})

Current view:
{payload.current_view}

Visible UI context:
{visible_context}

Memory:
{memory_context or "None"}

Evidence:
{evidence_context or "None"}

Chat history:
{history or "None"}

User question:
{payload.question}

Answer in 2-4 short sentences. Use exact labels from Visible UI context for next clicks."""
    result = llm.complete(system=system, user=user, model=settings.groq_fast_model, temperature=0.05, max_tokens=420)
    if not result or not result.content.strip():
        return fallback, suggestions, 76, "demo-fallback"

    return result.content.strip(), suggestions, 86 if memories or evidence else 78, "live"


def _guide_suggestions(current_view: str) -> list[str]:
    by_view = {
        "today": ["Open top priority", "Review context gaps", "Open account next step"],
        "accounts": ["Switch Account", "Open Dashboard", "Run Planner"],
        "dashboard": ["Review selected action", "Check evidence", "Run Planner"],
        "outcomes": ["Read projected impact", "Open Escalation Radar", "Open account dashboard"],
        "escalations": ["Check owner and deadline", "Open Execution Studio", "Run Planner"],
        "blueprints": ["Compare domains", "Review enabled agents", "Check success metrics"],
        "crm": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "interactions": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "knowledge": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "risks": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "candidates": ["Run BGV", "Save and ingest to memory", "Run Planner"],
        "memory": ["Read Neural Memory Mesh", "Inspect Memory Ledger", "Open source tabs"],
        "execution": ["Approve & Generate", "Copy artifact", "Open Memory"],
        "trace": ["Run Planner", "Review agent trace", "Check retrieved evidence"],
    }
    return by_view.get(current_view, ["Run Planner", "Open Dashboard", "Ask FlowGuide"])


def _screen_grounded_guide(payload: GuideChatRequest, account_name: str, visible_context: dict) -> str | None:
    question = payload.question.lower()
    screen_question = any(
        phrase in question
        for phrase in [
            "what should i do",
            "what do i do",
            "what to do",
            "next on this",
            "on this page",
            "on this screen",
            "this page",
            "this screen",
            "where should i click",
            "how to use this",
        ]
    )
    if not screen_question:
        return None

    screen = visible_context.get("current_screen") or payload.current_view
    source_counts = visible_context.get("source_counts") or {}
    selected = visible_context.get("selected_recommendation") or {}
    selected_title = selected.get("title") if isinstance(selected, dict) else None
    recommendations = visible_context.get("visible_recommendations") or []
    top_title = selected_title
    if not top_title and recommendations and isinstance(recommendations[0], dict):
        top_title = recommendations[0].get("title")

    if payload.current_view == "dashboard":
        first = f"You are on the Dashboard for {account_name}."
        if top_title:
            first += f" Start by reviewing the selected recommendation: {top_title}."
        return (
            f"{first} Check the Recommendation Inbox, read the Evidence For Selected Action panel, then approve or reject only after the evidence matches the business risk. "
            "Use Run Planner after you add new CRM, Meetings & Mail, Knowledge, Risks, or Candidates/BGV data."
        )
    if payload.current_view == "outcomes":
        return (
            "You are on Outcomes. This page measures whether Flow360 is helping across accounts: SLA risk movement, approval time saved, evidence coverage, memory freshness, candidate clearance speed, and renewal movement. "
            "Open an account card when a metric needs action, or use Escalation Radar when the scorecard shows a decision owner is blocking progress."
        )
    if payload.current_view == "escalations":
        return (
            "You are on Escalation Radar. Start with critical or high items, confirm the owner, deadline, channel, and evidence, then open the account or Execution Studio to turn the escalation into a message or task. "
            "The radar is generated from account memory, sources, and planner recommendations."
        )
    if payload.current_view == "blueprints":
        return (
            "You are on Domain Blueprint Studio. This page proves Flow360 is reusable: each blueprint defines source types, enabled agents, memory layers, rules, metrics, and recommendation categories for a different business domain. "
            "Use it in the demo to show the same platform can run healthcare staffing, SaaS customer success, and energy field service workflows."
        )
    if payload.current_view in {"crm", "interactions", "knowledge", "risks", "candidates"}:
        count = source_counts.get(payload.current_view, 0) if isinstance(source_counts, dict) else 0
        return (
            f"You are on {screen}. This page is for adding or reviewing source data; it currently has {count} connected entries. "
            "Use Load sample or paste a real-looking entry, then click Save and ingest to memory. "
            "Nothing becomes a new plan until you click Run Planner."
        )
    if payload.current_view == "today":
        return (
            "You are on Today, the all-account Daily Command Brief. Start with the highest ranked account, read Why today, Changed recently, and Missing before confidence rises, then click that card's next-step button. "
            "This page is for prioritizing work before opening a specific account screen."
        )
    if payload.current_view == "memory":
        total = sum(int(value) for value in source_counts.values()) if isinstance(source_counts, dict) else 0
        return (
            f"You are on Memory for {account_name}. Use the Neural Memory Mesh to see how CRM, Meetings & Mail, Knowledge, Risks, Candidates/BGV, and human review memory connect to the account. "
            f"There are {total} visible source entries. Use Memory Ledger to check whether a memory is fresh, stale, contradicted, human-approved, or AI-inferred before trusting it."
        )
    if payload.current_view == "execution":
        return (
            f"You are on Execution for {account_name}. Start with the selected recommendation, click Approve & Generate if it is correct, then copy the artifact you need: customer email, CRM task, escalation note, SLA update, or meeting summary. "
            "After approval, Flow360 writes the review and execution outcome back to memory."
        )
    if payload.current_view == "trace":
        return (
            "You are on Trace. Use this screen after Run Planner to explain how the planner routed ingestion, retrieval, analysis, recommendation, review, and memory updates. "
            "If the trace is empty, go back to Dashboard and click Run Planner."
        )
    if payload.current_view == "accounts":
        return (
            "You are on Accounts. Pick one client account first; each account reuses the same backend workflow but loads different CRM, meeting, knowledge, risk, and memory context. "
            "After choosing an account, open Dashboard or a source tab."
        )
    return None


BLUEPRINT_CATEGORY_KEYS = [
    "source_types",
    "memory_types",
    "business_rules",
    "recommendation_categories",
    "success_metrics",
    "agents_enabled",
]


def _suggest_blueprint(payload: BlueprintSuggestionRequest) -> dict[str, Any]:
    fallback = _fallback_blueprint(payload.account_text, payload.domain, payload.blueprint_title)
    if not llm.enabled:
        return fallback

    system = (
        "You are a domain architect for Flow360. A non-technical user describes a new business account. "
        "Suggest a reusable decision-intelligence blueprint that can be stored as an account configuration. "
        "Return strict JSON only with keys: account and options. "
        "account keys: name, segment, description, primary_user, supports_candidates. "
        "options keys must be exactly: source_types, memory_types, business_rules, recommendation_categories, success_metrics, agents_enabled. "
        "Each options value must be an array of 5-7 concise user-readable strings. Use practical business wording, not engineering jargon."
    )
    user = f"""Selected base domain: {payload.blueprint_title} ({payload.domain})

Account description from user:
{payload.account_text}
"""
    result = llm.complete_json(
        system=system,
        user=user,
        fallback=fallback,
        model=settings.groq_fast_model,
        temperature=0.15,
        max_tokens=1200,
    )
    if not isinstance(result, dict):
        return fallback
    return _normalize_blueprint(result, fallback, payload.domain)


def _suggest_blueprint_options(payload: BlueprintOptionRequest) -> dict[str, Any]:
    fallback = {"options": _fallback_options_for(payload.category, payload.domain, payload.instruction)}
    if payload.category not in BLUEPRINT_CATEGORY_KEYS:
        return fallback
    if not llm.enabled:
        return fallback

    system = (
        "You add options to one step of a Flow360 account blueprint wizard. "
        "Return strict JSON only: {\"options\": [\"...\"]}. "
        "Options must be concise, business-friendly, and non-duplicate."
    )
    user = f"""Domain: {payload.domain}
Category: {payload.category}
Current selected options: {payload.selected_options}
User request for more options: {payload.instruction}
Account description:
{payload.account_text}
"""
    result = llm.complete_json(
        system=system,
        user=user,
        fallback=fallback,
        model=settings.groq_fast_model,
        temperature=0.2,
        max_tokens=450,
    )
    if not isinstance(result, dict):
        return fallback
    options = result.get("options") if isinstance(result.get("options"), list) else fallback["options"]
    return {"options": _clean_option_list(options, fallback["options"], limit=5)}


def _fallback_blueprint(account_text: str, domain: str, blueprint_title: str) -> dict[str, Any]:
    cleaned = _clip(account_text, 240)
    title = "New Enterprise Account"
    if "bank" in account_text.lower() or "payment" in account_text.lower():
        title = "New Financial Services Account"
    elif "hospital" in account_text.lower() or "clinic" in account_text.lower():
        title = "New Healthcare Account"
    elif "energy" in account_text.lower() or "utility" in account_text.lower():
        title = "New Field Service Account"
    segment = blueprint_title or domain.replace("_", " ").title()
    supports_candidates = domain == "healthcare_staffing"
    return {
        "account": {
            "name": title,
            "segment": segment,
            "description": cleaned or f"New {segment} account configured from Domain Blueprint Studio.",
            "primary_user": "Account Manager" if domain != "saas_customer_success" else "Customer Success Manager",
            "supports_candidates": supports_candidates,
        },
        "options": {
            "source_types": _fallback_options_for("source_types", domain, account_text),
            "memory_types": _fallback_options_for("memory_types", domain, account_text),
            "business_rules": _fallback_options_for("business_rules", domain, account_text),
            "recommendation_categories": _fallback_options_for("recommendation_categories", domain, account_text),
            "success_metrics": _fallback_options_for("success_metrics", domain, account_text),
            "agents_enabled": _fallback_options_for("agents_enabled", domain, account_text),
        },
    }


def _fallback_options_for(category: str, domain: str, instruction: str = "") -> list[str]:
    defaults: dict[str, dict[str, list[str]]] = {
        "healthcare_staffing": {
            "source_types": ["CRM account profile", "Meeting notes", "Email thread", "Candidate profile", "Credentialing checklist", "SLA breach RCA"],
            "memory_types": ["Account profile memory", "Stakeholder memory", "Candidate clearance memory", "Rule memory", "Incident memory"],
            "business_rules": ["Block uncleared candidates from final shortlist", "Escalate premium rates above policy threshold", "Flag start dates inside 5 days", "Require evidence for replacement guarantees"],
            "recommendation_categories": ["Credentialing escalation", "Shortlist delivery", "Rate approval", "Replacement guarantee", "Stakeholder follow-up"],
            "success_metrics": ["Start-date adherence", "Candidate clearance speed", "SLA breach risk", "Approval turnaround", "Renewal sentiment"],
            "agents_enabled": ["Planner Agent", "Retrieval Agent", "BGV Agent", "Business Analyst Agent", "Recommendation Agent", "Memory Agent"],
        },
        "saas_customer_success": {
            "source_types": ["CRM renewal record", "QBR notes", "Support ticket RCA", "Usage report", "Executive email", "Product roadmap note"],
            "memory_types": ["Account profile memory", "Adoption memory", "Technical incident memory", "Stakeholder memory", "Renewal risk memory"],
            "business_rules": ["Red renewals inside 90 days need a save plan", "Technical blockers require an owner", "Executive complaints need same-week follow-up", "Low adoption requires enablement action"],
            "recommendation_categories": ["Renewal save plan", "Product escalation", "Adoption play", "Executive alignment", "Support recovery"],
            "success_metrics": ["Renewal risk movement", "Adoption lift", "Open blocker reduction", "Approval time saved", "Executive sentiment"],
            "agents_enabled": ["Planner Agent", "Retrieval Agent", "Adoption Analyst Agent", "Risk Analyst Agent", "Recommendation Agent", "Memory Agent"],
        },
        "energy_field_service": {
            "source_types": ["Dispatch log", "Outage incident note", "Safety checklist", "Technician roster", "Maintenance contract note", "Root cause report"],
            "memory_types": ["Asset memory", "Safety rule memory", "Outage episode memory", "Technician profile memory", "Contract risk memory"],
            "business_rules": ["Safety-critical outages outrank routine work", "Missing certified technician coverage triggers escalation", "Repeat SLA misses increase renewal risk", "High-risk work needs safety owner sign-off"],
            "recommendation_categories": ["Dispatch escalation", "Safety approval", "Maintenance reschedule", "Technician allocation", "Renewal-risk mitigation"],
            "success_metrics": ["Outage recovery time", "Safety compliance", "Technician coverage", "SLA breach risk", "Contract risk movement"],
            "agents_enabled": ["Planner Agent", "Retrieval Agent", "Field Risk Agent", "Safety Analyst Agent", "Recommendation Agent", "Memory Agent"],
        },
    }
    options = defaults.get(domain, defaults["healthcare_staffing"]).get(category, [])
    if instruction.strip() and not options:
        return [_clip(instruction, 70)]
    return options


def _normalize_blueprint(result: dict[str, Any], fallback: dict[str, Any], domain: str) -> dict[str, Any]:
    account = result.get("account") if isinstance(result.get("account"), dict) else {}
    fallback_account = fallback["account"]
    options = result.get("options") if isinstance(result.get("options"), dict) else {}
    return {
        "account": {
            "name": _clip(account.get("name") or fallback_account["name"], 80),
            "segment": _clip(account.get("segment") or fallback_account["segment"], 80),
            "description": _clip(account.get("description") or fallback_account["description"], 240),
            "primary_user": _clip(account.get("primary_user") or fallback_account["primary_user"], 80),
            "supports_candidates": bool(account.get("supports_candidates", fallback_account["supports_candidates"])),
            "domain": domain,
        },
        "options": {
            key: _clean_option_list(options.get(key), fallback["options"][key], limit=7)
            for key in BLUEPRINT_CATEGORY_KEYS
        },
    }


def _clean_option_list(value: Any, fallback: list[str], limit: int = 7) -> list[str]:
    raw = value if isinstance(value, list) else fallback
    cleaned: list[str] = []
    for item in raw:
        text = _clip(str(item), 92)
        if text and text.lower() not in {existing.lower() for existing in cleaned}:
            cleaned.append(text)
    return (cleaned or fallback)[:limit]


OUTCOME_LABELS = [
    "SLA breach risk reduced",
    "Approval time saved",
    "Recommendations approved/rejected",
    "Evidence coverage",
    "Memory freshness",
    "Candidate clearance speed",
    "Renewal risk movement",
]


def _generate_account_intelligence(account_id: str) -> dict[str, Any]:
    payload = _account_context_payload(account_id)
    fallback = _fallback_account_intelligence(payload)
    if not llm.enabled:
        return fallback

    system = (
        "You are Flow360's business intelligence agent. Generate a Business Outcome Scorecard and Escalation Radar "
        "from the provided account memory, source entries, candidates, and recommendations only. "
        "Do not invent product UI or integration facts. If a metric cannot be measured, mark before/after/delta as N/A and explain the missing input. "
        "Return strict JSON only with keys: account_id, account_name, outcomes, escalations. "
        "outcomes must include headline, overall_score 0-100, confidence 0-100, projected_impact, and metrics. "
        "metrics must contain exactly these labels in this order: "
        + ", ".join(OUTCOME_LABELS)
        + ". Each metric needs label, before, after, delta, rationale. "
        "escalations must contain 1-3 items with title, owner, role, deadline, reason, evidence, channel, priority."
    )
    result = llm.complete_json(
        system=system,
        user=json.dumps(payload, indent=2, default=str),
        fallback=fallback,
        model=settings.groq_reasoning_model,
        temperature=0.08,
    )
    if not isinstance(result, dict):
        return fallback
    return _normalize_account_intelligence(payload, result, fallback)


def _account_context_payload(account_id: str) -> dict[str, Any]:
    account = store.get_account(account_id)
    sources: dict[str, list[dict[str, Any]]] = {}
    for collection in ["crm", "interactions", "knowledge", "risks", "candidates"]:
        entries = []
        for entry in store.list_source_entries(account_id, collection)[:5]:
            row = entry.model_dump(mode="json")
            row["content"] = _clip(row.get("content", ""), 900)
            entries.append(row)
        sources[collection] = entries

    recommendations = []
    for item in store.list_recommendations(account_id)[:8]:
        recommendation = dict(item)
        recommendation["evidence"] = [
            {
                "source_title": evidence.get("source_title", ""),
                "source_type": evidence.get("source_type", ""),
                "snippet": _clip(evidence.get("snippet", ""), 320),
                "relevance": evidence.get("relevance", 0),
            }
            for evidence in recommendation.get("evidence", [])
            if isinstance(evidence, dict)
        ][:5]
        recommendations.append(recommendation)

    return {
        "account": account.model_dump(mode="json"),
        "sources": sources,
        "memory": [card.model_dump(mode="json") for card in store.get_memory("account", account_id)[:14]],
        "recommendations": recommendations,
        "candidates": [candidate.model_dump(mode="json") for candidate in store.list_candidates(account_id)[:8]],
        "retrieved_context": [
            evidence.model_dump(mode="json")
            for evidence in store.retrieve_context(
                "business outcome scorecard escalation owner SLA renewal approval evidence candidate clearance",
                account_id,
                top_k=6,
            )
        ],
    }


def _fallback_account_intelligence(payload: dict[str, Any]) -> dict[str, Any]:
    account = payload["account"]
    sources = payload.get("sources", {})
    memory = payload.get("memory", [])
    recommendations = payload.get("recommendations", [])
    candidates = payload.get("candidates", [])
    top = recommendations[0] if recommendations else {}
    total_sources = sum(len(items) for items in sources.values())
    avg_memory = (
        round(sum(int(item.get("confidence", 0)) for item in memory) / max(len(memory), 1))
        if memory
        else 0
    )
    approved = sum(1 for item in recommendations if item.get("status") == "approved")
    rejected = sum(1 for item in recommendations if item.get("status") == "rejected")
    pending = sum(1 for item in recommendations if item.get("status") == "pending")
    blocked_candidates = sum(
        1
        for item in candidates
        if item.get("missing_items") or "pending" in str(item.get("credentialing_status", "")).lower()
    )
    evidence_count = sum(len(item.get("evidence", [])) for item in recommendations)

    source_richness = "high" if total_sources >= 12 else "medium" if total_sources >= 6 else "low"
    after_risk = "lower" if approved else "actionable"
    owner = top.get("owner_role") or account.get("primary_user") or "Account Manager"
    priority = _clean_priority(top.get("priority", "medium"))

    metrics = [
        {
            "label": "SLA breach risk reduced",
            "before": account.get("health", "unknown"),
            "after": after_risk,
            "delta": "Projected improvement after top actions",
            "rationale": f"{len(recommendations)} recommendations and {total_sources} connected sources indicate where SLA risk can be reduced.",
        },
        {
            "label": "Approval time saved",
            "before": "Manual evidence chase",
            "after": "Evidence packet ready" if evidence_count else "N/A",
            "delta": f"{evidence_count} evidence links",
            "rationale": "Linked evidence reduces the time needed to brief the decision owner.",
        },
        {
            "label": "Recommendations approved/rejected",
            "before": f"{pending} pending",
            "after": f"{approved} approved / {rejected} rejected",
            "delta": f"{len(recommendations)} total",
            "rationale": "Human review status shows whether recommendations are becoming decisions.",
        },
        {
            "label": "Evidence coverage",
            "before": "Scattered sources",
            "after": f"{source_richness} coverage",
            "delta": f"{total_sources} sources",
            "rationale": "CRM, interactions, knowledge, risks, and candidate records are counted as coverage inputs.",
        },
        {
            "label": "Memory freshness",
            "before": "Unverified context",
            "after": f"{avg_memory}% memory trust" if avg_memory else "N/A",
            "delta": f"{len(memory)} memory cards",
            "rationale": "Memory confidence and recent source writebacks determine planner trust.",
        },
        {
            "label": "Candidate clearance speed",
            "before": f"{blocked_candidates} blockers" if candidates else "N/A",
            "after": "BGV-ready queue" if candidates and not blocked_candidates else "Needs credentialing review" if candidates else "N/A",
            "delta": f"{len(candidates)} candidates tracked" if candidates else "No candidate workflow",
            "rationale": "Candidate clearance applies only to accounts with people-level staffing decisions.",
        },
        {
            "label": "Renewal risk movement",
            "before": account.get("renewal_date") or "N/A",
            "after": "Lower if escalations close on time",
            "delta": "Projected",
            "rationale": "Renewal movement depends on resolving open risks with evidence-backed actions.",
        },
    ]

    return {
        "account_id": account["id"],
        "account_name": account["name"],
        "outcomes": {
            "headline": f"{account['name']} has {source_richness} evidence coverage and {len(recommendations)} active decision paths.",
            "overall_score": _clamp(
                52 + min(total_sources, 18) * 2 + min(avg_memory, 95) // 5 + approved * 4 - blocked_candidates * 4
            ),
            "confidence": _clamp(avg_memory or 72),
            "projected_impact": (
                f"Completing the top action can reduce visible account risk by aligning {owner} with the strongest evidence packet."
            ),
            "metrics": metrics,
        },
        "escalations": [
            {
                "title": top.get("title") or "Confirm the next accountable owner",
                "owner": owner,
                "role": owner,
                "deadline": top.get("due_date") or "Next business day",
                "reason": top.get("rationale") or "The account has unresolved context that affects the next business decision.",
                "evidence": [
                    item.get("source_title", "Linked account evidence")
                    for item in top.get("evidence", [])
                    if isinstance(item, dict)
                ][:3]
                or [memory[0]["title"] if memory else "Account memory"],
                "channel": "Customer email + CRM task" if priority in {"critical", "high"} else "CRM task",
                "priority": priority,
            }
        ],
    }


def _normalize_account_intelligence(
    payload: dict[str, Any], result: dict[str, Any], fallback: dict[str, Any]
) -> dict[str, Any]:
    account = payload["account"]
    outcomes = result.get("outcomes") if isinstance(result.get("outcomes"), dict) else {}
    raw_metrics = outcomes.get("metrics") if isinstance(outcomes.get("metrics"), list) else []
    raw_by_label = {
        str(item.get("label", "")).strip().lower(): item
        for item in raw_metrics
        if isinstance(item, dict)
    }
    fallback_by_label = {item["label"].lower(): item for item in fallback["outcomes"]["metrics"]}
    metrics = []
    for label in OUTCOME_LABELS:
        raw = raw_by_label.get(label.lower()) or fallback_by_label[label.lower()]
        metrics.append(
            {
                "label": label,
                "before": _clip(str(raw.get("before", "N/A")), 90),
                "after": _clip(str(raw.get("after", "N/A")), 90),
                "delta": _clip(str(raw.get("delta", "N/A")), 90),
                "rationale": _clip(str(raw.get("rationale", "")), 240),
            }
        )

    escalations = []
    raw_escalations = result.get("escalations") if isinstance(result.get("escalations"), list) else []
    for item in raw_escalations[:3]:
        if not isinstance(item, dict):
            continue
        evidence = item.get("evidence", [])
        if not isinstance(evidence, list):
            evidence = [str(evidence)]
        escalations.append(
            {
                "title": _clip(str(item.get("title") or "Escalation required"), 120),
                "owner": _clip(str(item.get("owner") or item.get("role") or account.get("primary_user") or "Account Manager"), 80),
                "role": _clip(str(item.get("role") or item.get("owner") or account.get("primary_user") or "Account Manager"), 80),
                "deadline": _clip(str(item.get("deadline") or "Next business day"), 80),
                "reason": _clip(str(item.get("reason") or "Decision owner alignment is required."), 280),
                "evidence": [_clip(str(value), 120) for value in evidence if str(value).strip()][:4],
                "channel": _clip(str(item.get("channel") or "CRM task"), 80),
                "priority": _clean_priority(item.get("priority", "medium")),
            }
        )
    if not escalations:
        escalations = fallback["escalations"]

    return {
        "account_id": account["id"],
        "account_name": account["name"],
        "outcomes": {
            "headline": _clip(str(outcomes.get("headline") or fallback["outcomes"]["headline"]), 180),
            "overall_score": _clamp(outcomes.get("overall_score"), fallback["outcomes"]["overall_score"]),
            "confidence": _clamp(outcomes.get("confidence"), fallback["outcomes"]["confidence"]),
            "projected_impact": _clip(
                str(outcomes.get("projected_impact") or fallback["outcomes"]["projected_impact"]),
                260,
            ),
            "metrics": metrics,
        },
        "escalations": escalations,
    }


def _clean_priority(value: Any) -> str:
    priority = str(value or "medium").lower()
    return priority if priority in {"critical", "high", "medium", "low"} else "medium"


def _clamp(value: Any, default: int = 72) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        number = default
    return max(0, min(100, number))


def _clip(value: Any, limit: int) -> str:
    text = str(value or "").replace("\n", " ").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "..."


def _extract_text(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""
    if suffix in {".docx", ".doc"}:
        try:
            import tempfile

            import docx2txt

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
                temp.write(content)
                temp_path = temp.name
            return docx2txt.process(temp_path) or ""
        except Exception:
            return ""
    return content.decode("utf-8", errors="ignore")
