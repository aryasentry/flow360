from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any, TypedDict

from app.config import Settings
from app.demo_data import DEMO_ACCOUNTS, DEMO_ACCOUNT_ID, DEMO_INTERACTION
from app.models import AgentRunRequest, AgentRunResult, AgentStep, Evidence, Recommendation
from app.services.groq_client import GroqRouter
from app.services.retrieval import EnterpriseRetriever
from app.services.store import PlatformStore


class FlowState(TypedDict, total=False):
    run_id: str
    account_id: str
    account_name: str
    objective: str
    interaction: str
    plan: list[str]
    retrieved_context: list[Evidence]
    analysis: dict[str, Any]
    recommendations: list[Recommendation]
    memory_updates: list[dict[str, Any]]
    agent_trace: list[AgentStep]


class Flow360Workflow:
    def __init__(self, settings: Settings, store: PlatformStore, llm: GroqRouter):
        self.settings = settings
        self.store = store
        self.retriever = EnterpriseRetriever(store)
        self.llm = llm
        self.graph = self._build_graph()

    def run(self, request: AgentRunRequest) -> AgentRunResult:
        state: FlowState = {
            "run_id": f"run-{uuid.uuid4().hex[:10]}",
            "account_id": request.account_id,
            "account_name": self._account_name(request.account_id),
            "objective": request.objective,
            "interaction": request.interaction or DEMO_INTERACTION,
            "agent_trace": [],
        }

        if self.graph:
            final_state = self.graph.invoke(state)
        else:
            final_state = state
            for node in [
                self._planner_node,
                self._ingestion_node,
                self._retrieval_node,
                self._analysis_node,
                self._recommendation_node,
                self._memory_node,
            ]:
                final_state = node(final_state)

        result = AgentRunResult(
            run_id=final_state["run_id"],
            account_id=final_state["account_id"],
            account_name=final_state["account_name"],
            analysis=final_state.get("analysis", {}),
            recommendations=final_state.get("recommendations", []),
            agent_trace=final_state.get("agent_trace", []),
            retrieved_context=final_state.get("retrieved_context", []),
            memory_updates=final_state.get("memory_updates", []),
            mode="live" if self.llm.enabled and self.store.live_mode else "demo-fallback",
        )
        self.store.save_run(
            result.run_id,
            {
                "account_id": result.account_id,
                "objective": request.objective,
                "analysis": result.analysis,
                "agent_trace": [step.model_dump(mode="json") for step in result.agent_trace],
                "recommendation_ids": [item.id for item in result.recommendations],
            },
        )
        self.store.save_recommendations(result.recommendations)
        return result

    @staticmethod
    def _account_name(account_id: str) -> str:
        for account in DEMO_ACCOUNTS:
            if account["id"] == account_id:
                return account["name"]
        return account_id

    def _build_graph(self):
        try:
            from langgraph.graph import END, StateGraph

            graph = StateGraph(FlowState)
            graph.add_node("planner", self._planner_node)
            graph.add_node("ingestion", self._ingestion_node)
            graph.add_node("retrieval", self._retrieval_node)
            graph.add_node("analysis", self._analysis_node)
            graph.add_node("recommendation", self._recommendation_node)
            graph.add_node("memory", self._memory_node)
            graph.set_entry_point("planner")
            graph.add_edge("planner", "ingestion")
            graph.add_edge("ingestion", "retrieval")
            graph.add_edge("retrieval", "analysis")
            graph.add_edge("analysis", "recommendation")
            graph.add_edge("recommendation", "memory")
            graph.add_edge("memory", END)
            return graph.compile()
        except Exception:
            return None

    def _append_trace(self, state: FlowState, name: str, summary: str, artifacts: list[str] | None = None) -> FlowState:
        trace = list(state.get("agent_trace", []))
        now = datetime.utcnow()
        trace.append(
            AgentStep(
                name=name,
                status="completed",
                summary=summary,
                artifacts=artifacts or [],
                started_at=now,
                completed_at=now,
            )
        )
        return {**state, "agent_trace": trace}

    def _planner_node(self, state: FlowState) -> FlowState:
        plan = [
            "Extract operational signals from the customer interaction.",
            "Retrieve account history, staffing playbooks, candidate data, and policy context.",
            "Analyze urgency, risk, missing information, and business opportunity.",
            "Generate ranked next best actions with evidence and confidence.",
            "Prepare memory updates after human review.",
        ]
        return self._append_trace({**state, "plan": plan}, "Planner Agent", "Selected a five-step staffing intelligence workflow.", plan)

    def _ingestion_node(self, state: FlowState) -> FlowState:
        interaction = state["interaction"]
        self.store.ingest_text(
            account_id=state["account_id"],
            title=f"Interaction captured for {state['account_name']}",
            content=interaction,
            source_type="customer_interaction",
        )
        artifacts = ["customer_interaction", "deadline_signal", "stakeholder_signal", "compliance_signal"]
        return self._append_trace(state, "Ingestion Agent", "Parsed the interaction and stored it as raw and semantic memory.", artifacts)

    def _retrieval_node(self, state: FlowState) -> FlowState:
        query = f"{state['objective']} {state['interaction']}"
        context = self.retriever.search(query=query, account_id=state["account_id"], top_k=8)
        source_names = [item.source_title for item in context[:5]]
        updated = {**state, "retrieved_context": context}
        return self._append_trace(updated, "Retrieval Agent", "Retrieved account, candidate, policy, and playbook evidence.", source_names)

    def _analysis_node(self, state: FlowState) -> FlowState:
        context_payload = [item.model_dump() for item in state.get("retrieved_context", [])]
        fallback = self._fallback_analysis(state["account_id"])
        analysis = self.llm.complete_json(
            system="You are a workforce operations analyst. Return only strict JSON with account_health, urgency_score, risks, opportunities, missing_information, and decision_points.",
            user=json.dumps({"interaction": state["interaction"], "context": context_payload}, indent=2),
            fallback=fallback,
            model=self.settings.groq_reasoning_model,
            temperature=0.15,
        )
        if not isinstance(analysis, dict):
            analysis = fallback
        updated = {**state, "analysis": analysis}
        return self._append_trace(updated, "Business Analyst Agent", "Identified renewal risk, compliance blockers, and missing buying context.", ["risk_map", "opportunity_map"])

    def _recommendation_node(self, state: FlowState) -> FlowState:
        evidence = state.get("retrieved_context", [])
        evidence_payload = [item.model_dump() for item in evidence]
        fallback = {"recommendations": self._fallback_recommendations(state["account_id"])}
        generated = self.llm.complete_json(
            system="You create staffing next best actions. Return strict JSON: {\"recommendations\": [...]}. Each item needs title, action, category, priority, owner_role, due_date, confidence, rationale, evidence_indexes, business_metric.",
            user=json.dumps({"analysis": state.get("analysis", {}), "evidence": evidence_payload}, indent=2),
            fallback=fallback,
            model=self.settings.groq_reasoning_model,
            temperature=0.18,
        )
        raw_items = generated.get("recommendations", []) if isinstance(generated, dict) else []
        recommendations: list[Recommendation] = []
        for index, item in enumerate(raw_items[:5]):
            evidence_items = self._select_evidence(evidence, item.get("evidence_indexes", []))
            priority = str(item.get("priority", "medium")).strip().lower()
            if priority not in {"critical", "high", "medium", "low"}:
                priority = "medium"
            try:
                confidence_value = float(item.get("confidence", 75))
            except (TypeError, ValueError):
                confidence_value = 75
            if 0 < confidence_value <= 1:
                confidence_value *= 100
            confidence = round(confidence_value)
            confidence = max(0, min(100, confidence))
            recommendations.append(
                Recommendation(
                    id=f"rec-{state['run_id']}-{index + 1}",
                    account_id=state["account_id"],
                    run_id=state["run_id"],
                    title=item.get("title", "Next best action"),
                    action=item.get("action", ""),
                    category=item.get("category", "Workflow"),
                    priority=priority,
                    owner_role=item.get("owner_role", "Account Manager"),
                    due_date=item.get("due_date", (datetime.utcnow() + timedelta(days=1)).strftime("%b %d")),
                    confidence=confidence,
                    rationale=item.get("rationale", ""),
                    evidence=evidence_items,
                    business_metric=item.get("business_metric", "Improve account outcome."),
                )
            )

        updated = {**state, "recommendations": recommendations}
        return self._append_trace(updated, "Recommendation Agent", "Produced ranked next best actions with owners, due dates, confidence, and evidence.", [item.title for item in recommendations])

    def _memory_node(self, state: FlowState) -> FlowState:
        memory_updates = [
            {
                "memory_type": "episodic",
                "target": state["account_id"],
                "summary": "Pending human review for generated staffing next best actions.",
            },
            {
                "memory_type": "profile",
                "target": state["account_id"],
                "summary": "Account remains renewal-sensitive until credentialing and CFO approval are resolved.",
            },
        ]
        updated = {**state, "memory_updates": memory_updates}
        return self._append_trace(updated, "Memory Agent", "Prepared episodic and profile memory updates for human-in-the-loop feedback.", ["episodic_memory", "profile_memory"])

    @staticmethod
    def _select_evidence(evidence: list[Evidence], indexes: list[Any]) -> list[Evidence]:
        selected: list[Evidence] = []
        for raw_index in indexes:
            try:
                index = int(raw_index)
            except (TypeError, ValueError):
                continue
            if 0 <= index < len(evidence):
                selected.append(evidence[index])
        if selected:
            return selected[:3]
        return evidence[:3]

    @staticmethod
    def _account_domain(account_id: str) -> str:
        for account in DEMO_ACCOUNTS:
            if account["id"] == account_id:
                return account["domain"]
        return "healthcare_staffing"

    def _fallback_analysis(self, account_id: str) -> dict[str, Any]:
        domain = self._account_domain(account_id)
        if domain == "saas_customer_success":
            return {
                "account_health": "red: renewal at risk because reliability and adoption issues are unresolved",
                "urgency_score": 88,
                "risks": [
                    "API latency incidents are affecting payment confirmation during settlement windows.",
                    "Reconciliation adoption is weak in key operations teams.",
                    "A competitor is positioning around lower pricing and dedicated reliability support.",
                ],
                "opportunities": [
                    "Create an executive save plan with RCA, prevention milestones, and named owners.",
                    "Rebuild sponsor trust with weekly steering updates.",
                ],
                "missing_information": [
                    "Final latency SLO accepted by Vikram Sethi.",
                    "Product owner commitment for webhook retry investigation.",
                    "Adoption baseline for reconciliation users by location.",
                ],
                "decision_points": [
                    "Whether to offer a named incident commander for 30 days.",
                    "Whether to include commercial concession only after reliability milestones are accepted.",
                ],
            }
        if domain == "energy_field_service":
            return {
                "account_health": "amber: SLA and safety risk rising during monsoon operations",
                "urgency_score": 78,
                "risks": [
                    "Transformer T-42 crossed heat thresholds and needs dispatch before peak load.",
                    "Assigned technicians have expired safety refresher certificates.",
                    "Hospital feeder SLA history increases communication risk.",
                ],
                "opportunities": [
                    "Prevent repeat SLA breach by pre-checking technician certification before dispatch.",
                    "Improve trust with two-hour ETA updates for critical feeders.",
                ],
                "missing_information": [
                    "Certified backup crew availability.",
                    "Latest site permit and weather clearance.",
                    "Customer-approved ETA communication owner.",
                ],
                "decision_points": [
                    "Dispatch alternate certified technicians or request written safety exception.",
                    "Escalate customer update before 3 PM or wait for final crew assignment.",
                ],
            }
        return {
            "account_health": "amber: renewal-sensitive with active SLA breach risk",
            "urgency_score": 91,
            "risks": [
                "Critical clinical starts are within 4 days while license verification is unresolved.",
                "Rohan Kulkarni needs premium-rate justification before approval.",
                "Prior credentialing misses increased renewal risk.",
            ],
            "opportunities": [
                "Win executive trust by sending a transparent cost-risk brief.",
                "Differentiate with a replacement guarantee tied to verified candidates.",
            ],
            "missing_information": [
                "Final license verification completion time for Ananya Sharma.",
                "CFO approval threshold for premium candidates.",
                "Replacement guarantee terms acceptable to Kavya Raman.",
            ],
            "decision_points": [
                "Show Ananya Sharma as conditional or wait for license verification.",
                "Whether to include premium candidates in the 4 PM shortlist.",
            ],
        }

    def _fallback_recommendations(self, account_id: str) -> list[dict[str, Any]]:
        domain = self._account_domain(account_id)
        if domain == "saas_customer_success":
            return [
                {
                    "title": "Create 30-day API reliability save plan",
                    "action": "Send Suhani Bansal and Vikram Sethi an executive save plan with latency RCA, prevention milestones, incident commander, and weekly steering updates.",
                    "category": "Renewal Save",
                    "priority": "critical",
                    "owner_role": "Customer Success Manager",
                    "due_date": "Next 24 hours",
                    "confidence": 88,
                    "rationale": "Renewal is red-health and the customer explicitly tied renewal confidence to API reliability recovery.",
                    "evidence_indexes": [0, 1, 2],
                    "business_metric": "Protect INR 9.6 Cr ARR and reduce renewal downgrade risk.",
                },
                {
                    "title": "Schedule reconciliation adoption workshop",
                    "action": "Book enablement with Chennai and Gurugram operations teams focused on exception matching and reconciliation trust gaps.",
                    "category": "Adoption",
                    "priority": "high",
                    "owner_role": "Solutions Consultant",
                    "due_date": "This week",
                    "confidence": 81,
                    "rationale": "Low reconciliation adoption is one of the renewal objections.",
                    "evidence_indexes": [1, 3],
                    "business_metric": "Increase purchased-module adoption before renewal committee.",
                },
            ]
        if domain == "energy_field_service":
            return [
                {
                    "title": "Replace uncertified technicians before T-42 dispatch",
                    "action": "Assign certified backup technicians or get written safety approval before dispatching the transformer maintenance crew.",
                    "category": "Safety",
                    "priority": "critical",
                    "owner_role": "Field Operations Manager",
                    "due_date": "Today, 1:00 PM",
                    "confidence": 87,
                    "rationale": "Safety refresher status is expired and transformer work cannot start without compliance clearance.",
                    "evidence_indexes": [0, 2, 3],
                    "business_metric": "Avoid safety breach and prevent repeat SLA delay.",
                },
                {
                    "title": "Send hospital feeder ETA update before 3 PM",
                    "action": "Send Harish Nambiar a customer-facing ETA update with site risk, crew status, and backup plan.",
                    "category": "Customer Communication",
                    "priority": "high",
                    "owner_role": "Dispatch Lead",
                    "due_date": "Today, 3:00 PM",
                    "confidence": 82,
                    "rationale": "Prior SLA breach was worsened by communication gaps during feeder restoration.",
                    "evidence_indexes": [1, 3],
                    "business_metric": "Improve trust while restoration is pending.",
                },
            ]
        return [
            {
                "title": "Block Ananya Sharma from final shortlist until license clears",
                "action": "Ask Meera Nair to verify Ananya Sharma's Karnataka nursing license before 2:30 PM and mark her conditional in the 4 PM shortlist.",
                "category": "Credentialing",
                "priority": "critical",
                "owner_role": "Compliance Lead",
                "due_date": "Today, 2:30 PM",
                "confidence": 91,
                "rationale": "The role starts within 4 days, license verification is pending, and Aarogya already had a renewal-risk incident from late license checks.",
                "evidence_indexes": [0, 2, 4],
                "business_metric": "Reduce SLA breach risk and protect renewal confidence.",
            },
            {
                "title": "Send premium-rate approval brief to Rohan Kulkarni",
                "action": "Prepare a one-page cost-risk brief comparing vacancy cost, overtime exposure, patient-care risk, and backup candidate availability.",
                "category": "Commercial",
                "priority": "high",
                "owner_role": "Account Manager",
                "due_date": "Friday, 11:00 AM",
                "confidence": 86,
                "rationale": "Rohan will not approve premium candidates above threshold without quantified business justification.",
                "evidence_indexes": [1, 5, 6],
                "business_metric": "Improve approval speed while keeping rate variance defensible.",
            },
        ]
