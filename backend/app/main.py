from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.agents.workflow import Flow360Workflow
from app.config import get_settings
from app.demo_data import DEMO_ACCOUNT_ID
from app.models import (
    AgentRunRequest,
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
        "crm": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "interactions": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "knowledge": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "risks": ["Load sample", "Save and ingest to memory", "Run Planner"],
        "candidates": ["Run BGV", "Save and ingest to memory", "Run Planner"],
        "memory": ["Read Memory Graph", "Inspect Memory Ledger", "Open source tabs"],
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
            f"You are on Memory for {account_name}. Use the Memory Graph to see how CRM, Meetings & Mail, Knowledge, Risks, and Candidates/BGV connect to the account. "
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
