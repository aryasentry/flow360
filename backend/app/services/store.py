from __future__ import annotations

import math
import re
import uuid
from datetime import datetime
from typing import Any

from app.config import Settings
from app.demo_data import DEMO_ACCOUNT_ID, DEMO_ACCOUNT_NAME, DEMO_DOCS, DEMO_MEMORY_CARDS
from app.models import Evidence, IngestResponse, MemoryCard, Recommendation
from app.services.embeddings import EmbeddingService
from app.services.llamaindex_adapter import chunk_text


class PlatformStore:
    def __init__(self, settings: Settings, embeddings: EmbeddingService):
        self.settings = settings
        self.embeddings = embeddings
        self.client = None
        self.storage_mode = "memory"
        self._documents: list[dict[str, Any]] = []
        self._chunks: list[dict[str, Any]] = []
        self._recommendations: dict[str, dict[str, Any]] = {}
        self._runs: dict[str, dict[str, Any]] = {}
        self._memory_cards: dict[str, dict[str, Any]] = {}
        self._connect_supabase()
        self.seed_demo_memory()
        self.seed_demo_documents()

    @property
    def live_mode(self) -> bool:
        return self.client is not None

    def _connect_supabase(self) -> None:
        if not self.settings.supabase_enabled:
            return
        try:
            from supabase import create_client

            key = self.settings.supabase_service_role_key or self.settings.supabase_anon_key
            self.client = create_client(self.settings.supabase_url, key)
            self.storage_mode = "supabase"
        except Exception:
            self.client = None
            self.storage_mode = "memory"

    def seed_demo_memory(self) -> None:
        for card in DEMO_MEMORY_CARDS:
            self._memory_cards[card["id"]] = card

    def seed_demo_documents(self) -> None:
        if self._documents:
            return
        for doc in DEMO_DOCS:
            self._documents.append(doc)
            for position, chunk in enumerate(chunk_text(doc["content"])):
                self._chunks.append(
                    {
                        "id": f"{doc['id']}-chunk-{position + 1}",
                        "document_id": doc["id"],
                        "account_id": doc["account_id"],
                        "title": doc["title"],
                        "source_type": doc["source_type"],
                        "content": chunk,
                        "embedding": self.embeddings.embed(chunk),
                    }
                )

    def ingest_text(self, account_id: str, title: str, content: str, source_type: str) -> IngestResponse:
        document_id = f"doc-{uuid.uuid4().hex[:12]}"
        chunks = chunk_text(content)
        document = {
            "id": document_id,
            "account_id": account_id,
            "title": title,
            "source_type": source_type,
            "content": content,
            "created_at": datetime.utcnow().isoformat(),
        }

        if self.client:
            try:
                self.client.table("documents").upsert(document).execute()
                rows = []
                for position, chunk in enumerate(chunks):
                    rows.append(
                        {
                            "id": f"{document_id}-chunk-{position + 1}",
                            "document_id": document_id,
                            "account_id": account_id,
                            "chunk_index": position,
                            "content": chunk,
                            "embedding": self.embeddings.embed(chunk),
                            "metadata": {"title": title, "source_type": source_type},
                        }
                    )
                if rows:
                    self.client.table("document_chunks").upsert(rows).execute()
                return IngestResponse(document_id=document_id, title=title, chunks_created=len(chunks), storage="supabase")
            except Exception:
                pass

        self._documents.append(document)
        for position, chunk in enumerate(chunks):
            self._chunks.append(
                {
                    "id": f"{document_id}-chunk-{position + 1}",
                    "document_id": document_id,
                    "account_id": account_id,
                    "title": title,
                    "source_type": source_type,
                    "content": chunk,
                    "embedding": self.embeddings.embed(chunk),
                }
            )
        return IngestResponse(document_id=document_id, title=title, chunks_created=len(chunks), storage="memory")

    def ingest_demo_documents(self) -> list[IngestResponse]:
        responses = []
        for doc in DEMO_DOCS:
            responses.append(self.ingest_text(doc["account_id"], doc["title"], doc["content"], doc["source_type"]))
        return responses

    def retrieve_context(self, query: str, account_id: str = DEMO_ACCOUNT_ID, top_k: int = 8) -> list[Evidence]:
        if self.client:
            try:
                query_embedding = self.embeddings.embed(query)
                response = self.client.rpc(
                    "match_document_chunks",
                    {
                        "query_embedding": query_embedding,
                        "match_count": top_k,
                        "filter_account_id": account_id,
                    },
                ).execute()
                data = response.data or []
                if data:
                    return [
                        Evidence(
                            source_id=row.get("document_id", row.get("id", "")),
                            source_title=row.get("title") or row.get("metadata", {}).get("title", "Enterprise context"),
                            source_type=row.get("source_type") or row.get("metadata", {}).get("source_type", "knowledge"),
                            snippet=row.get("content", "")[:500],
                            relevance=float(row.get("similarity", 0.0)),
                        )
                        for row in data
                    ]
            except Exception:
                pass

        return self._keyword_search(query, account_id, top_k)

    def _keyword_search(self, query: str, account_id: str, top_k: int) -> list[Evidence]:
        query_terms = set(re.findall(r"[a-zA-Z0-9]+", query.lower()))
        scored = []
        for chunk in self._chunks:
            if chunk["account_id"] not in {account_id, "global"}:
                continue
            chunk_terms = set(re.findall(r"[a-zA-Z0-9]+", chunk["content"].lower()))
            overlap = len(query_terms & chunk_terms)
            if overlap == 0:
                overlap = 1 if any(term in chunk["content"].lower() for term in ["credential", "renewal", "sla"]) else 0
            score = overlap / math.sqrt(max(len(chunk_terms), 1))
            scored.append((score, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            Evidence(
                source_id=chunk["document_id"],
                source_title=chunk["title"],
                source_type=chunk["source_type"],
                snippet=chunk["content"][:500],
                relevance=round(score, 3),
            )
            for score, chunk in scored[:top_k]
        ]

    def save_run(self, run_id: str, result: dict[str, Any]) -> None:
        self._runs[run_id] = result
        if self.client:
            try:
                self.client.table("agent_runs").upsert(
                    {
                        "id": run_id,
                        "account_id": result.get("account_id", DEMO_ACCOUNT_ID),
                        "objective": result.get("objective", ""),
                        "status": "completed",
                        "analysis": result.get("analysis", {}),
                        "agent_trace": result.get("agent_trace", []),
                    }
                ).execute()
            except Exception:
                pass

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        if run_id in self._runs:
            return self._runs[run_id]
        if self.client:
            try:
                response = self.client.table("agent_runs").select("*").eq("id", run_id).single().execute()
                return response.data
            except Exception:
                return None
        return None

    def save_recommendations(self, recommendations: list[Recommendation]) -> None:
        for recommendation in recommendations:
            self._recommendations[recommendation.id] = recommendation.model_dump(mode="json")
        if self.client and recommendations:
            try:
                rows = [recommendation.model_dump(mode="json") for recommendation in recommendations]
                self.client.table("recommendations").upsert(rows).execute()
            except Exception:
                pass

    def list_recommendations(self, account_id: str | None = None) -> list[dict[str, Any]]:
        if self.client:
            try:
                query = self.client.table("recommendations").select("*").order("created_at", desc=True)
                if account_id:
                    query = query.eq("account_id", account_id)
                response = query.execute()
                if response.data:
                    return response.data
            except Exception:
                pass
        values = list(self._recommendations.values())
        if account_id:
            values = [item for item in values if item.get("account_id") == account_id]
        return sorted(values, key=lambda item: item.get("created_at", ""), reverse=True)

    def review_recommendation(self, recommendation_id: str, decision: str, reviewer: str, notes: str) -> dict[str, Any]:
        review = {
            "id": f"review-{uuid.uuid4().hex[:10]}",
            "recommendation_id": recommendation_id,
            "decision": decision,
            "reviewer": reviewer,
            "notes": notes,
            "created_at": datetime.utcnow().isoformat(),
        }

        if recommendation_id in self._recommendations:
            self._recommendations[recommendation_id]["status"] = decision

        if self.client:
            try:
                self.client.table("recommendations").update({"status": decision}).eq("id", recommendation_id).execute()
                self.client.table("recommendation_feedback").insert(review).execute()
            except Exception:
                pass

        self._write_feedback_memory(recommendation_id, decision, notes)
        return review

    def _write_feedback_memory(self, recommendation_id: str, decision: str, notes: str) -> None:
        rec = self._recommendations.get(recommendation_id, {})
        memory_id = f"mem-feedback-{recommendation_id}"
        summary = f"{decision.title()} recommendation '{rec.get('title', recommendation_id)}'."
        if notes:
            summary += f" Reviewer notes: {notes}"
        card = {
            "id": memory_id,
            "entity_type": "account",
            "entity_id": rec.get("account_id", DEMO_ACCOUNT_ID),
            "title": "Human Review Feedback",
            "memory_type": "episodic",
            "summary": summary,
            "confidence": 93,
            "updated_at": datetime.utcnow().isoformat(),
        }
        self._memory_cards[memory_id] = card
        if self.client:
            try:
                self.client.table("memory_cards").upsert(card).execute()
            except Exception:
                pass

    def get_memory(self, entity_type: str, entity_id: str) -> list[MemoryCard]:
        if self.client:
            try:
                response = (
                    self.client.table("memory_cards")
                    .select("*")
                    .eq("entity_type", entity_type)
                    .eq("entity_id", entity_id)
                    .order("updated_at", desc=True)
                    .execute()
                )
                if response.data:
                    return [MemoryCard(**item) for item in response.data]
            except Exception:
                pass
        return [
            MemoryCard(**card)
            for card in self._memory_cards.values()
            if card["entity_type"] == entity_type and card["entity_id"] == entity_id
        ]

    def dashboard_state(self) -> dict[str, Any]:
        return {
            "account": {"id": DEMO_ACCOUNT_ID, "name": DEMO_ACCOUNT_NAME, "segment": "Healthcare staffing"},
            "recommendations": self.list_recommendations(DEMO_ACCOUNT_ID),
            "memory": [card.model_dump(mode="json") for card in self.get_memory("account", DEMO_ACCOUNT_ID)],
            "mode": "live" if self.live_mode else "demo-fallback",
        }
