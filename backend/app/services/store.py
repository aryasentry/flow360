from __future__ import annotations

import math
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import Settings
from app.demo_data import DEMO_ACCOUNTS, DEMO_ACCOUNT_ID, DEMO_CANDIDATES, DEMO_DOCS, DEMO_INTERACTIONS, DEMO_MEMORY_CARDS, DEMO_SOURCE_ENTRIES
from app.models import AccountSummary, BGVResult, CandidateProfile, DashboardMetric, Evidence, IngestResponse, MemoryCard, Recommendation, RiskTrendPoint, SourceEntry
from app.services.embeddings import EmbeddingService
from app.services.llamaindex_adapter import chunk_text


class PlatformStore:
    def __init__(self, settings: Settings, embeddings: EmbeddingService):
        self.settings = settings
        self.embeddings = embeddings
        self.client = None
        self.storage_mode = "memory"
        self._accounts: dict[str, dict[str, Any]] = {}
        self._documents: list[dict[str, Any]] = []
        self._chunks: list[dict[str, Any]] = []
        self._source_entries: dict[str, dict[str, Any]] = {}
        self._candidates: dict[str, dict[str, Any]] = {}
        self._recommendations: dict[str, dict[str, Any]] = {}
        self._runs: dict[str, dict[str, Any]] = {}
        self._memory_cards: dict[str, dict[str, Any]] = {}
        self._connect_supabase()
        self.seed_demo_accounts()
        self.seed_demo_sources()
        self.seed_demo_candidates()
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

    def seed_demo_accounts(self) -> None:
        for account in DEMO_ACCOUNTS:
            self._accounts[account["id"]] = account

    def seed_demo_sources(self) -> None:
        for entry in [*DEMO_SOURCE_ENTRIES, *self._mock_file_source_entries()]:
            self._source_entries[entry["id"]] = entry
            self._write_source_memory(entry)

    def seed_demo_candidates(self) -> None:
        for candidate in DEMO_CANDIDATES:
            self._candidates[candidate["id"]] = candidate

    def seed_demo_memory(self) -> None:
        for card in DEMO_MEMORY_CARDS:
            self._memory_cards[card["id"]] = card

    def seed_demo_documents(self) -> None:
        if self._documents:
            return
        for doc in [*DEMO_DOCS, *self._mock_file_documents()]:
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
                        "metadata": doc.get("metadata", {}),
                    }
                )

    def list_accounts(self) -> list[AccountSummary]:
        demo_ids = {account["id"] for account in DEMO_ACCOUNTS}
        accounts_by_id = {account["id"]: account for account in DEMO_ACCOUNTS}
        if self.client:
            try:
                response = self.client.table("accounts").select("*").order("name").execute()
                if response.data:
                    for row in response.data:
                        if row.get("id") in demo_ids:
                            accounts_by_id[row["id"]] = row
            except Exception:
                pass
        return [self._account_from_row(accounts_by_id[account["id"]]) for account in DEMO_ACCOUNTS]

    def get_account(self, account_id: str) -> AccountSummary:
        demo_ids = {account["id"] for account in DEMO_ACCOUNTS}
        if self.client:
            try:
                response = self.client.table("accounts").select("*").eq("id", account_id).single().execute()
                if response.data and response.data.get("id") in demo_ids:
                    return self._account_from_row(response.data)
            except Exception:
                pass
        return self._account_from_row(self._accounts.get(account_id) or self._accounts[DEMO_ACCOUNT_ID])

    @staticmethod
    def _account_from_row(row: dict[str, Any]) -> AccountSummary:
        metadata = row.get("metadata") or {}
        return AccountSummary(
            id=row["id"],
            name=row["name"],
            segment=row.get("segment", metadata.get("segment", "Account")),
            domain=row.get("domain") or metadata.get("domain", "healthcare_staffing"),
            health=row.get("health", metadata.get("health", "unknown")),
            renewal_date=str(row.get("renewal_date") or metadata.get("renewal_date") or "") or None,
            description=row.get("description") or metadata.get("description", ""),
            supports_candidates=bool(row.get("supports_candidates", metadata.get("supports_candidates", False))),
            primary_user=row.get("primary_user") or metadata.get("primary_user", "Account Manager"),
            metrics=[DashboardMetric(**item) for item in metadata.get("metrics", row.get("metrics", []))],
            risk_trend=[RiskTrendPoint(**item) for item in metadata.get("risk_trend", row.get("risk_trend", []))],
            metadata=metadata,
        )

    def list_source_entries(self, account_id: str, collection: str | None = None) -> list[SourceEntry]:
        entries_by_id = {entry["id"]: entry for entry in self._source_entries.values()}
        if self.client:
            try:
                query = self.client.table("source_entries").select("*").eq("account_id", account_id).order("created_at", desc=True)
                if collection:
                    query = query.eq("collection", collection)
                response = query.execute()
                if response.data:
                    for row in response.data:
                        entries_by_id[row["id"]] = row
            except Exception:
                pass
        entries = list(entries_by_id.values())
        filtered = [
            entry
            for entry in entries
            if entry.get("account_id") == account_id and (collection is None or entry.get("collection") == collection)
        ]
        return [SourceEntry(**entry) for entry in sorted(filtered, key=lambda item: item.get("created_at", ""), reverse=True)]

    def ingest_source_entry(
        self,
        account_id: str,
        collection: str,
        source_type: str,
        title: str,
        content: str,
        fields: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        fields = fields or {}
        entry_id = f"src-{uuid.uuid4().hex[:12]}"
        entry = {
            "id": entry_id,
            "account_id": account_id,
            "collection": collection,
            "source_type": source_type,
            "title": title,
            "content": content,
            "fields": fields,
            "created_at": datetime.utcnow().isoformat(),
        }
        self._source_entries[entry_id] = entry

        if collection == "candidates":
            candidate_id = fields.get("candidate_id") or f"cand-{uuid.uuid4().hex[:10]}"
            self._candidates[candidate_id] = {
                "id": candidate_id,
                "account_id": account_id,
                "name": fields.get("name", title.replace("Candidate Profile - ", "")),
                "role": fields.get("role", "Candidate"),
                "availability_date": fields.get("availability_date"),
                "credentialing_status": fields.get("credentialing_status", "unknown"),
                "bgv_status": fields.get("bgv_status", "not_started"),
                "fit_score": int(fields.get("fit_score", 70) or 70),
                "rate_variance_percent": float(fields.get("rate_variance_percent", 0) or 0),
                "missing_items": self._as_list(fields.get("missing_items", [])),
                "risk_flags": self._as_list(fields.get("risk_flags", [])),
                "metadata": fields,
            }

        if self.client:
            try:
                self.client.table("source_entries").upsert(entry).execute()
            except Exception:
                pass

        ingest = self.ingest_text(account_id, title, content, source_type)
        memory = self._write_source_memory(entry)
        return {"entry": SourceEntry(**entry).model_dump(mode="json"), "ingest": ingest.model_dump(), "memory": memory}

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
        for doc in [*DEMO_DOCS, *self._mock_file_documents()]:
            responses.append(self.ingest_text(doc["account_id"], doc["title"], doc["content"], doc["source_type"]))
        return responses

    def _mock_file_documents(self) -> list[dict[str, Any]]:
        root = Path(__file__).resolve().parents[3] / "data" / "mock_docs"
        if not root.exists():
            return []
        documents: list[dict[str, Any]] = []
        for path in sorted(root.iterdir()):
            if path.suffix.lower() not in {".md", ".csv", ".txt"}:
                continue
            content = path.read_text(encoding="utf-8", errors="ignore").strip()
            if not content:
                continue
            account_id = "acct-aarogya-health"
            if "navapay" in path.name.lower():
                account_id = "acct-navapay-fintech"
            elif "prithvigrid" in path.name.lower():
                account_id = "acct-prithvigrid-energy"

            source_type = "mock_enterprise_document"
            name = path.name.lower()
            if "candidate" in name or "shortlist" in name:
                source_type = "candidate_shortlist"
            elif "competitor" in name:
                source_type = "competitor_intelligence"
            elif "credential" in name or "checklist" in name:
                source_type = "credentialing_checklist"
            elif "playbook" in name:
                source_type = "playbook"
            elif "runbook" in name:
                source_type = "technical_runbook"
            elif "rate" in name:
                source_type = "rate_card_policy"
            elif "policy" in name or "guarantee" in name:
                source_type = "company_policy"
            elif "rca" in name or "incident" in name or "sla" in name:
                source_type = "root_cause_analysis"
            elif "renewal" in name:
                source_type = "renewal_risk_note"
            elif "crm" in name or "stakeholder" in name:
                source_type = "crm_context"
            elif "dispatch" in name:
                source_type = "field_dispatch_note"
            elif any(token in name for token in ["meeting", "qbr", "email", "notes", "huddle", "workshop", "war_room"]):
                source_type = "customer_interaction"

            documents.append(
                {
                    "id": f"mock-{path.stem}",
                    "title": path.stem.replace("_", " ").replace("-", " ").title(),
                    "source_type": source_type,
                    "account_id": account_id,
                    "content": content,
                    "metadata": {"file_name": path.name, "mock_doc": True},
                }
            )
        return documents

    def _mock_file_source_entries(self) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []
        for doc in self._mock_file_documents():
            source_type = doc["source_type"]
            collection = "knowledge"
            if source_type in {"crm_context", "competitor_intelligence"}:
                collection = "crm"
            elif source_type in {"customer_interaction", "field_dispatch_note"}:
                collection = "interactions"
            elif source_type in {"root_cause_analysis", "renewal_risk_note"}:
                collection = "risks"
            elif source_type == "candidate_shortlist":
                collection = "candidates"

            entries.append(
                {
                    "id": f"src-{doc['id']}",
                    "account_id": doc["account_id"],
                    "collection": collection,
                    "source_type": source_type,
                    "title": doc["title"],
                    "content": doc["content"],
                    "fields": {
                        "file_name": doc.get("metadata", {}).get("file_name", ""),
                        "origin": "formal_mock_document",
                    },
                    "created_at": datetime.utcnow().isoformat(),
                }
            )
        return entries

    def retrieve_context(self, query: str, account_id: str = DEMO_ACCOUNT_ID, top_k: int = 8) -> list[Evidence]:
        evidence: list[Evidence] = []
        seen_sources: set[str] = set()
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
                    for row in data:
                        item = Evidence(
                            source_id=row.get("document_id", row.get("id", "")),
                            source_title=row.get("title") or row.get("metadata", {}).get("title", "Enterprise context"),
                            source_type=row.get("source_type") or row.get("metadata", {}).get("source_type", "knowledge"),
                            snippet=row.get("content", "")[:500],
                            relevance=float(row.get("similarity", 0.0)),
                        )
                        evidence.append(item)
                        seen_sources.add(item.source_id)
            except Exception:
                pass

        for item in self._keyword_search(query, account_id, top_k):
            if item.source_id not in seen_sources:
                evidence.append(item)
                seen_sources.add(item.source_id)
        return evidence[:top_k]

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
        execution = None
        if decision == "approved":
            execution = self._create_action_execution(recommendation_id, reviewer)
        return {"review": review, "action_execution": execution}

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

    def _write_source_memory(self, entry: dict[str, Any]) -> dict[str, Any]:
        memory_type = {
            "crm": "profile",
            "interactions": "raw",
            "knowledge": "rule",
            "risks": "episodic",
            "candidates": "profile",
        }.get(entry.get("collection"), "semantic")
        card = {
            "id": f"mem-{entry['id']}",
            "entity_type": "account",
            "entity_id": entry["account_id"],
            "title": entry["title"],
            "memory_type": memory_type,
            "summary": entry["content"][:420],
            "confidence": 86,
            "updated_at": datetime.utcnow().isoformat(),
            "metadata": {"source_entry_id": entry["id"], "collection": entry["collection"]},
        }
        self._memory_cards[card["id"]] = card
        if self.client:
            try:
                self.client.table("memory_cards").upsert(card).execute()
            except Exception:
                pass
        return card

    def _create_action_execution(self, recommendation_id: str, reviewer: str) -> dict[str, Any] | None:
        rec = self._recommendations.get(recommendation_id, {})
        if not rec:
            return None
        execution = {
            "id": f"exec-{uuid.uuid4().hex[:10]}",
            "recommendation_id": recommendation_id,
            "account_id": rec.get("account_id", DEMO_ACCOUNT_ID),
            "title": rec.get("title", "Approved next best action"),
            "owner_role": rec.get("owner_role", "Account Manager"),
            "status": "queued",
            "draft": f"Approved by {reviewer}. Next step: {rec.get('action', '')}",
            "created_at": datetime.utcnow().isoformat(),
        }
        if self.client:
            try:
                self.client.table("action_executions").upsert(execution).execute()
            except Exception:
                pass
        card = {
            "id": f"mem-execution-{recommendation_id}",
            "entity_type": "account",
            "entity_id": execution["account_id"],
            "title": "Approved Action Queued",
            "memory_type": "episodic",
            "summary": f"Approved and queued action '{execution['title']}' for {execution['owner_role']}.",
            "confidence": 94,
            "updated_at": datetime.utcnow().isoformat(),
        }
        self._memory_cards[card["id"]] = card
        return execution

    def get_memory(self, entity_type: str, entity_id: str) -> list[MemoryCard]:
        cards_by_id = {
            card["id"]: card
            for card in self._memory_cards.values()
            if card["entity_type"] == entity_type and card["entity_id"] == entity_id
        }
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
                    for item in response.data:
                        cards_by_id[item["id"]] = item
            except Exception:
                pass
        return [
            MemoryCard(**card)
            for card in sorted(cards_by_id.values(), key=lambda item: item.get("updated_at", ""), reverse=True)
        ]

    def list_candidates(self, account_id: str) -> list[CandidateProfile]:
        candidates_by_id = {
            candidate["id"]: candidate for candidate in self._candidates.values() if candidate["account_id"] == account_id
        }
        if self.client:
            try:
                response = self.client.table("candidates").select("*").eq("account_id", account_id).order("name").execute()
                if response.data:
                    for row in response.data:
                        candidates_by_id[row["id"]] = row
            except Exception:
                pass
        return [self._candidate_from_row(candidate) for candidate in candidates_by_id.values()]

    @staticmethod
    def _as_list(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if value is None:
            return []
        return [item.strip() for item in str(value).split(",") if item.strip()]

    @staticmethod
    def _candidate_from_row(row: dict[str, Any]) -> CandidateProfile:
        metadata = row.get("metadata") or {}
        return CandidateProfile(
            id=row["id"],
            account_id=row.get("account_id") or metadata.get("account_id", DEMO_ACCOUNT_ID),
            name=row["name"],
            role=row.get("role", "Candidate"),
            availability_date=str(row.get("availability_date") or metadata.get("availability_date") or "") or None,
            credentialing_status=row.get("credentialing_status") or metadata.get("credentialing_status", "unknown"),
            bgv_status=row.get("bgv_status") or metadata.get("bgv_status", "not_started"),
            fit_score=int(row.get("fit_score") or metadata.get("fit_score", 70)),
            rate_variance_percent=float(row.get("rate_variance_percent") or metadata.get("rate_variance_percent", 0)),
            missing_items=row.get("missing_items") or metadata.get("missing_items", []),
            risk_flags=row.get("risk_flags") or metadata.get("risk_flags", []),
            metadata=metadata,
        )

    def run_bgv_check(self, account_id: str, candidate_id: str) -> BGVResult:
        candidate = self._candidate_from_row(self._candidates.get(candidate_id) or {"id": candidate_id, "account_id": account_id, "name": candidate_id, "role": "Candidate"})
        query = f"credentialing BGV checklist {candidate.name} {candidate.role} {candidate.credentialing_status} {candidate.bgv_status}"
        evidence = self.retrieve_context(query, account_id=account_id, top_k=4)
        missing = list(candidate.missing_items)
        score = candidate.fit_score
        if candidate.credentialing_status.lower() == "fully verified" and candidate.bgv_status.lower() == "verified" and not missing:
            status = "verified"
            summary = f"{candidate.name} is ready for shortlist. Credentialing and BGV are verified."
            score = max(score, 92)
        elif any("license" in item.lower() for item in missing) or "pending" in candidate.credentialing_status.lower():
            status = "blocked"
            summary = f"{candidate.name} should not be shortlisted as fully cleared yet. Credentialing blocker: {', '.join(missing) or candidate.credentialing_status}."
            score = min(score, 68)
        else:
            status = "needs_review"
            summary = f"{candidate.name} can be considered conditionally, but the account team must resolve: {', '.join(missing) or candidate.credentialing_status}."
            score = min(score, 82)

        card = {
            "id": f"mem-bgv-{candidate_id}",
            "entity_type": "account",
            "entity_id": account_id,
            "title": f"BGV Check - {candidate.name}",
            "memory_type": "profile",
            "summary": summary,
            "confidence": score,
            "updated_at": datetime.utcnow().isoformat(),
        }
        self._memory_cards[card["id"]] = card
        return BGVResult(candidate_id=candidate_id, status=status, score=score, summary=summary, missing_items=missing, evidence=evidence)

    def dashboard_state(self, account_id: str = DEMO_ACCOUNT_ID) -> dict[str, Any]:
        account = self.get_account(account_id)
        return {
            "accounts": [account.model_dump(mode="json") for account in self.list_accounts()],
            "account": account.model_dump(mode="json"),
            "recommendations": self.list_recommendations(account_id),
            "memory": [card.model_dump(mode="json") for card in self.get_memory("account", account_id)],
            "sources": {
                collection: [entry.model_dump(mode="json") for entry in self.list_source_entries(account_id, collection)]
                for collection in ["crm", "interactions", "knowledge", "risks", "candidates"]
            },
            "candidates": [candidate.model_dump(mode="json") for candidate in self.list_candidates(account_id)],
            "metrics": [item.model_dump(mode="json") for item in account.metrics],
            "riskTrend": [item.model_dump(mode="json") for item in account.risk_trend],
            "demoInteraction": DEMO_INTERACTIONS.get(account_id, account.description),
            "mode": "live" if self.live_mode else "demo-fallback",
        }
