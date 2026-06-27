# Flow360 Feature List

This document summarizes what Flow360 includes and how each capability supports the hackathon requirement.

## 1. Landing Page

- Dark cinematic Flow360 hero inspired by premium AI SaaS pages
- Original coded design, not a copied screenshot background
- Strong side vignettes, centered product frame, and dashboard preview
- Clear positioning: agentic decision intelligence for staffing teams
- Primary call to action routes into the operator dashboard

## 2. Operator Dashboard

- Multi-account landing view with Aarogya Health Network, NavaPay Fintech, and PrithviGrid Utilities
- Collapsible sidebar with icon+label mode and icon-only mode
- Account command center for each selected client
- Recommendation inbox
- Selected recommendation detail panel
- Evidence drawer style sections
- Agent decision flow panel
- Metrics for critical requirements, SLA risk, renewal exposure, and memory confidence
- Minimal-click workflow for demo delivery
- Right-side FlowGuide assistant that sees the active account, visible tab, selected recommendation, memory, and source counts

## 3. Source-System Tabs

Flow360 simulates enterprise integrations through internal source pages:

- CRM Dashboard: client owner, decision maker, renewal date, contract value, stakeholder context
- Meeting Notes, Transcripts And Mails: customer calls, email threads, meeting summaries
- Knowledge Base: policies, playbooks, credentialing checklists, rate cards
- Risks And Incidents: SLA breaches, RCA notes, renewal risks, previous mistakes
- Candidates And BGV: candidate profiles and credentialing checks when the business decision is about individuals

Each tab supports structured entry. Relevant tabs also support file upload. Saving or uploading creates memory immediately.

Each source tab also includes pending import samples. They are intentionally not counted as memory until the user loads the sample and saves it, which makes the ingestion loop visible during the demo.

## 4. Agentic Workflow

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

## 5. Ingestion

Supported paths:

- `POST /ingest/text`
- `POST /ingest/upload`
- `POST /ingest/demo`
- `POST /sources`

Supported uploaded content:

- Plain text
- PDF
- DOC/DOCX best-effort extraction
- CRM notes
- Email threads
- Meeting transcripts
- Playbooks and policies

## 6. Retrieval

- LlamaIndex-style text chunking
- Ollama embeddings using `nomic-embed-text:latest`
- Supabase pgvector search through RPC
- Metadata-aware retrieval by account id
- Keyword fallback when Supabase is unavailable

## 7. LLM Reasoning

- Groq-backed reasoning
- API key rotation in `backend/app/services/groq_client.py`
- Structured JSON parsing for analysis and recommendations
- Fallback recommendations when LLM access is unavailable

Models configured by default:

- `llama-3.3-70b-versatile` for reasoning
- `llama-3.1-8b-instant` for lightweight memory answers

## 8. Recommendations

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

> Block Ananya Sharma from final shortlist until license clears because the role starts within 4 days, license verification is pending, and Aarogya already had a renewal-risk incident from late license checks.

## 9. Human-In-The-Loop Review

- Users can approve or reject recommendations
- Review status updates immediately in the UI
- Review feedback is saved through `POST /recommendations/{id}/review`
- Feedback becomes episodic memory for future decisions
- Approved actions create a queued execution draft, so approval prepares follow-through instead of only changing button state

## 10. Persistent Memory

Memory types:

- Raw memory: original uploaded content
- Semantic memory: embedded chunks
- Episodic memory: agent runs and review feedback
- Profile memory: account summaries and stakeholder context
- Rule memory: playbooks, policies, SLA rules, and commercial thresholds

## 11. Memory Graph UI

- Visual account-centered memory graph
- Separates profile, rule, episodic, semantic, and raw memory
- Helps judges see that Flow360 has persistent context, not one-off chat state

## 12. FlowGuide Assistant

- Persistent right-side chat panel
- Uses `POST /guide/chat`
- Sees the active account, current tab, selected recommendation, visible metrics, source counts, memory, and evidence
- Helps users navigate, understand business terms, and decide what to click next
- Frontend does not expose model-provider details

## 13. Candidate BGV And Credentialing

- Available for individual-centric healthcare staffing decisions
- Runs BGV/credentialing check per candidate
- Checks license, background verification, missing documents, risk flags, fit score, and rate variance
- Writes BGV outcome into memory
- Prevents unsafe shortlisting when license or compliance is incomplete

## 14. Supabase Integration

Supabase is used for:

- Documents
- Document chunks
- Vector embeddings
- Agent runs
- Recommendations
- Recommendation feedback
- Memory cards
- Source entries
- Candidates
- Action executions

SQL scripts live in `supabase/sql/`.

## 15. Demo Fallback Mode

The platform can still run when cloud services are missing:

- In-memory document store
- Keyword retrieval fallback
- Seeded demo memory
- Fallback analysis and recommendations

This protects the hackathon demo from network/API issues.

## 16. Mock Enterprise Data

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
- SaaS renewal save plan
- API latency incident review
- Energy safety lockout policy
- Transformer dispatch notes

## 17. Why It Is Reusable

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
