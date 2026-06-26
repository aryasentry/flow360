# Flow360 Feature List

This document summarizes what Flow360 includes and how each capability supports the hackathon requirement.

## 1. Landing Page

- Dark cinematic Flow360 hero inspired by premium AI SaaS pages
- Original coded design, not a copied screenshot background
- Strong side vignettes, centered product frame, and dashboard preview
- Clear positioning: agentic decision intelligence for staffing teams
- Primary call to action routes into the operator dashboard

## 2. Operator Dashboard

- Compact left navigation
- Account command center for Northstar Health Network
- Recommendation inbox
- Selected recommendation detail panel
- Evidence drawer style sections
- Agent decision flow panel
- Metrics for critical requirements, SLA risk, renewal exposure, and memory confidence
- Minimal-click workflow for demo delivery

## 3. Agentic Workflow

Implemented in `backend/app/agents/workflow.py`.

Agents:

- Planner Agent
- Ingestion Agent
- Retrieval Agent
- Business Analyst Agent
- Recommendation Agent
- Memory Agent

The planner uses a five-step workflow:

1. Extract operational signals.
2. Retrieve account, policy, candidate, and playbook context.
3. Analyze urgency, risk, opportunity, and missing information.
4. Generate ranked next best actions.
5. Prepare memory updates for human feedback.

## 4. Ingestion

Supported paths:

- `POST /ingest/text`
- `POST /ingest/upload`
- `POST /ingest/demo`

Supported uploaded content:

- Plain text
- PDF
- DOC/DOCX best-effort extraction
- CRM notes
- Email threads
- Meeting transcripts
- Playbooks and policies

## 5. Retrieval

- LlamaIndex-style text chunking
- Ollama embeddings using `nomic-embed-text:latest`
- Supabase pgvector search through RPC
- Metadata-aware retrieval by account id
- Keyword fallback when Supabase is unavailable

## 6. LLM Reasoning

- Groq-backed reasoning
- API key rotation in `backend/app/services/groq_client.py`
- Structured JSON parsing for analysis and recommendations
- Fallback recommendations when LLM access is unavailable

Models configured by default:

- `llama-3.3-70b-versatile` for reasoning
- `llama-3.1-8b-instant` for lightweight memory answers

## 7. Recommendations

Each recommendation includes:

- Title
- Action
- Category
- Priority
- Owner role
- Due date
- Confidence
- Rationale
- Supporting evidence
- Business metric
- Review status

Example:

> Escalate Priya N.'s license verification because the role starts within 5 days, credentialing is unresolved, and the account has prior SLA risk.

## 8. Human-In-The-Loop Review

- Users can approve or reject recommendations
- Review status updates immediately in the UI
- Review feedback is saved through `POST /recommendations/{id}/review`
- Feedback becomes episodic memory for future decisions

## 9. Persistent Memory

Memory types:

- Raw memory: original uploaded content
- Semantic memory: embedded chunks
- Episodic memory: agent runs and review feedback
- Profile memory: account summaries and stakeholder context
- Rule memory: playbooks, policies, SLA rules, and commercial thresholds

## 10. Memory Graph UI

- Visual account-centered memory graph
- Separates profile, rule, episodic, semantic, and raw memory
- Helps judges see that Flow360 has persistent context, not one-off chat state

## 11. Ask Memory

- Dashboard includes a question panel over persistent memory
- Uses `POST /memory/query`
- Answers with memory and evidence context
- Frontend does not expose model-provider details

## 12. Supabase Integration

Supabase is used for:

- Documents
- Document chunks
- Vector embeddings
- Agent runs
- Recommendations
- Recommendation feedback
- Memory cards

SQL scripts live in `supabase/sql/`.

## 13. Demo Fallback Mode

The platform can still run when cloud services are missing:

- In-memory document store
- Keyword retrieval fallback
- Seeded demo memory
- Fallback analysis and recommendations

This protects the hackathon demo from network/API issues.

## 14. Mock Enterprise Data

Included under `data/mock_docs/`:

- Meeting transcript
- CRM account history
- Candidate shortlist
- Credentialing checklist
- Staffing escalation playbook
- CFO email thread
- Renewal risk notes
- Rate card policy
- SLA incident RCA
- Stakeholder map
- Competitor intelligence

## 15. Why It Is Reusable

Flow360 is not hardcoded to one recommendation. The same platform pattern can be reused for:

- Staffing operations
- Customer success
- SaaS sales
- Energy field service
- Healthcare operations
- Renewal management
- Account risk management

To adapt it, change:

- Mock documents
- Business rules
- Agent prompts
- Memory types
- Recommendation schema
- Dashboard labels
