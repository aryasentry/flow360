from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    source_id: str
    source_title: str
    source_type: str
    snippet: str
    relevance: float = 0.0


class Recommendation(BaseModel):
    id: str
    account_id: str
    run_id: str
    title: str
    action: str
    category: str
    priority: Literal["critical", "high", "medium", "low"]
    owner_role: str
    due_date: str
    confidence: int = Field(ge=0, le=100)
    rationale: str
    evidence: list[Evidence]
    business_metric: str
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentStep(BaseModel):
    name: str
    status: Literal["planned", "running", "completed", "skipped", "failed"] = "completed"
    summary: str
    artifacts: list[str] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class AgentRunRequest(BaseModel):
    account_id: str = "acct-northstar-health"
    interaction: str | None = None
    objective: str = "Recommend the next best actions for the account team."


class AgentRunResult(BaseModel):
    run_id: str
    account_id: str
    account_name: str
    analysis: dict[str, Any]
    recommendations: list[Recommendation]
    agent_trace: list[AgentStep]
    retrieved_context: list[Evidence]
    memory_updates: list[dict[str, Any]]
    mode: Literal["live", "demo-fallback"] = "demo-fallback"


class TextIngestRequest(BaseModel):
    account_id: str = "acct-northstar-health"
    title: str
    content: str
    source_type: str = "note"


class IngestResponse(BaseModel):
    document_id: str
    title: str
    chunks_created: int
    storage: Literal["supabase", "memory"]


class RecommendationReviewRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    reviewer: str = "demo.user@flow360.ai"
    notes: str = ""


class MemoryQueryRequest(BaseModel):
    entity_type: str = "account"
    entity_id: str = "acct-northstar-health"
    question: str


class MemoryCard(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    title: str
    memory_type: Literal["raw", "semantic", "episodic", "profile", "rule"]
    summary: str
    confidence: int = Field(ge=0, le=100, default=80)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MemoryQueryResponse(BaseModel):
    answer: str
    confidence: int = Field(ge=0, le=100, default=78)
    memory_used: list[MemoryCard] = Field(default_factory=list)
    evidence_used: list[Evidence] = Field(default_factory=list)
    mode: Literal["live", "demo-fallback"] = "demo-fallback"
