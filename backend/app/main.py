from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.agents.workflow import Flow360Workflow
from app.config import get_settings
from app.demo_data import DEMO_ACCOUNT_ID, DEMO_INTERACTION, DEMO_METRICS, RISK_TREND
from app.models import AgentRunRequest, Evidence, MemoryCard, MemoryQueryRequest, RecommendationReviewRequest, TextIngestRequest
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
def demo_state() -> dict:
    state = store.dashboard_state()
    state.update({"metrics": DEMO_METRICS, "riskTrend": RISK_TREND, "demoInteraction": DEMO_INTERACTION})
    return state


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
):
    content = await file.read()
    text = _extract_text(file.filename or "uploaded-file", content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from uploaded file.")
    return store.ingest_text(account_id, file.filename or "uploaded-file", text, source_type)


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
