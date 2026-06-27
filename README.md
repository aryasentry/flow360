# Flow360

Flow360 is an agentic next best action platform for B2B workforce and staffing operations. It turns customer interactions, CRM history, enterprise playbooks, candidate data, and persistent memory into ranked, explainable recommendations that a human can approve or reject.

The goal is not to build another chatbot or basic RAG demo. Flow360 is designed as reusable decision intelligence infrastructure with planner-led agents, enterprise retrieval, persistent memory, explainable recommendations, and human-in-the-loop review.

## What This Project Solves

Staffing and workforce teams make high-pressure decisions from scattered context:

- Meeting notes and client calls
- Email threads and CRM updates
- Candidate shortlists
- Credentialing rules
- Rate card policies
- Escalation playbooks
- Renewal and SLA history

Flow360 combines those signals and recommends what the account manager or recruiter should do next.

Example:

> Block Ananya Sharma from final shortlist until her license clears because the start date is within 4 days, license verification is incomplete, and the account has prior SLA breach risk. Confidence: 91%. Evidence: meeting transcript, credentialing checklist, CRM account history.

## Demo Domain

The MVP demonstrates one reusable platform across three fictional Indian B2B accounts:

- Aarogya Health Network: healthcare staffing, candidate BGV, credentialing, SLA, and renewal risk
- NavaPay Fintech: SaaS customer success, API latency, product adoption, and ARR renewal risk
- PrithviGrid Utilities: energy field service, outage response, technician safety, and SLA risk

The frontend includes simulated source-system pages for CRM, meetings/mails, knowledge base, risks/incidents, and candidates/BGV. These pages behave like internal connectors: when a user adds a new entry or uploads a document, the backend ingests it into Flow360 memory.

## Core Features

- Premium SaaS landing page with a dark cinematic Flow360 hero
- Operator dashboard for account managers
- Multi-account account picker with three business types
- CRM dashboard tab for structured customer/account data
- Meeting notes, transcript, and mail tab
- Knowledge base tab for policies, playbooks, checklists, and rate cards
- Risks and incidents tab for SLA breaches, RCA notes, and renewal risks
- Candidates/BGV tab for individual credentialing decisions when applicable
- Collapsible sidebar with icon+label and icon-only mode
- Right-side FlowGuide assistant that sees the current screen, memory, and evidence
- Planner-driven agent workflow using LangGraph
- Text and file ingestion for transcripts, CRM notes, emails, PDFs, and docs
- LlamaIndex-style chunking for retrieval-ready enterprise knowledge
- Supabase Postgres and pgvector memory store
- Ollama local embeddings using `nomic-embed-text:latest`
- Groq LLM routing with API key rotation
- Ranked next best action recommendations
- Evidence, confidence, rationale, owner, due date, and business metric per recommendation
- Human approval or rejection before recommendations are accepted
- Persistent memory updates from human review
- Memory graph UI
- Conversational memory and navigation assistant through FlowGuide
- Demo fallback mode if Supabase or Groq is not configured

See the full feature breakdown in [FEATURES.md](FEATURES.md).

## Architecture

```text
Customer interaction / upload
        |
        v
FastAPI ingestion endpoints
        |
        v
LangGraph Planner Agent
        |
        +--> Ingestion Agent
        +--> Retrieval Agent
        +--> Business Analyst Agent
        +--> Recommendation Agent
        +--> Memory Agent
        |
        v
Supabase Postgres + pgvector memory
        |
        v
Next.js operator dashboard
        |
        v
Human review and memory update
```

## Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- lucide-react icons
- Recharts

### Backend

- FastAPI
- LangGraph
- LlamaIndex-related utilities
- Groq SDK
- Supabase Python client
- Pydantic

### Data And Memory

- Supabase Postgres
- Supabase pgvector
- Supabase Storage-ready configuration
- Ollama embeddings with `nomic-embed-text:latest`

### LLM

- Groq API
- Reasoning model: `llama-3.3-70b-versatile`
- Fast model: `llama-3.1-8b-instant`

Only the embedding model is local through Ollama. Groq and Supabase are cloud/API services.

## Folder Structure

```text
flow360/
  backend/
    app/
      agents/
        workflow.py
      services/
        embeddings.py
        groq_client.py
        llamaindex_adapter.py
        retrieval.py
        store.py
      main.py
      models.py
      config.py
    requirements.txt
    .env.example

  frontend/
    src/
      app/
        page.tsx
        app/page.tsx
        globals.css
      components/
        flow-dashboard.tsx
      lib/
        api.ts
        demo-data.ts
        types.ts
    package.json
    .env.example

  supabase/
    sql/
      001_extensions.sql
      002_schema.sql
      003_vector_search.sql
      004_seed_data.sql

  data/
    mock_docs/

  docs/
    architecture_walkthrough.md
    demo_script.md
    flow360-explainer.html
    setup.md
```

## Prerequisites

Install these before running the project:

- Python 3.11 or newer
- Node.js 20 or newer
- npm
- Ollama
- Supabase project
- Groq API key

## 1. Clone The Repository

```powershell
git clone https://github.com/aryasentry/flow360.git
cd flow360
```

If you already have the local folder, continue from the project root.

## 2. Install Ollama Embedding Model

Flow360 uses Ollama only for embeddings. Install and start Ollama, then pull the embedding model:

```powershell
ollama pull nomic-embed-text:latest
ollama list
```

Verify that `nomic-embed-text:latest` appears in the list.

Ollama should be available at:

```text
http://localhost:11434
```

## 3. Configure Supabase

Create a Supabase project, open the SQL editor, and run these scripts in order:

```text
supabase/sql/000_reset_all_demo_data.sql -- optional, only when resetting an existing demo DB
supabase/sql/001_extensions.sql
supabase/sql/002_schema.sql
supabase/sql/003_vector_search.sql
supabase/sql/004_seed_data.sql
```

These scripts enable pgvector, create the platform tables, add vector search RPCs, and seed demo data.

## 4. Configure Backend Environment

Copy the backend env template:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env`:

```env
ENVIRONMENT=local
BACKEND_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

GROQ_API_KEYS=your_groq_key_1,your_groq_key_2
GROQ_REASONING_MODEL=llama-3.3-70b-versatile
GROQ_FAST_MODEL=llama-3.1-8b-instant

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=documents

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
EMBEDDING_DIM=768
```

Important:

- Do not commit real `.env` files.
- Regenerate any API keys that were shared in chat or screenshots.
- The app can run in demo fallback mode, but Supabase and Groq enable the full live workflow.

## 5. Create Backend Virtual Environment

From the project root:

```powershell
py -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Start the FastAPI backend:

```powershell
uvicorn app.main:app --reload --app-dir backend --port 8000
```

Check the backend:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing
```

You can also open Swagger:

```text
http://127.0.0.1:8000/docs
```

## 6. Configure Frontend Environment

In another terminal:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

The default value should be:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## 7. Install And Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## 8. Optional: Seed Demo Documents Through API

After Supabase and the backend are running, call:

```powershell
Invoke-WebRequest -Method POST http://127.0.0.1:8000/ingest/demo -UseBasicParsing
```

This ingests the mock enterprise documents and creates retrieval chunks.

## Demo Flow

Use this flow for the hackathon video:

1. Open `http://localhost:3000`.
2. Show the premium Flow360 landing page.
3. Click `Get Started`.
4. Select one of the three accounts.
5. Show CRM, meetings/mails, knowledge, and risks/incidents tabs as simulated integrations.
6. For Aarogya, open Candidates/BGV and run a credentialing check.
7. Click `Run Planner`.
8. Open a top recommendation and explain confidence, rationale, owner, due date, and evidence.
9. Approve or reject the action and show that approval creates a queued execution draft plus memory.
10. Use FlowGuide on the right side to ask what to click next or why the recommendation matters.

## Backend Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Backend, Groq, and Supabase status |
| `GET /demo/state` | Dashboard demo state |
| `GET /accounts` | List all configured client accounts |
| `GET /sources/{account_id}` | List CRM, interaction, knowledge, risk, and candidate source entries |
| `POST /sources` | Create a structured source entry and ingest it into memory |
| `POST /ingest/text` | Ingest pasted text |
| `POST /ingest/demo` | Ingest bundled mock documents |
| `POST /ingest/upload` | Upload and index files |
| `POST /agent/run` | Run the planner-led workflow |
| `GET /agent/runs/{run_id}` | Fetch a saved agent run |
| `GET /recommendations` | List recommendations |
| `POST /recommendations/{id}/review` | Approve or reject a recommendation |
| `GET /candidates/{account_id}` | List candidate profiles for individual-centric accounts |
| `POST /candidates/{account_id}/{candidate_id}/bgv` | Run candidate BGV/credentialing check |
| `GET /memory/{entity_type}/{entity_id}` | Fetch memory cards |
| `POST /memory/query` | Ask questions over persistent memory |
| `POST /guide/chat` | Ask the right-side FlowGuide assistant for contextual help |

## Mock Data

The project includes fictional documents under `data/mock_docs/`:

- Client meeting transcript
- CRM account history
- Candidate shortlist
- Staffing escalation playbook
- Credentialing checklist
- CFO email thread
- Renewal risk notes
- Rate card policy
- Stakeholder map
- SLA incident notes
- Competitor intelligence

No real customer data is used.

## Verification Commands

Run frontend checks:

```powershell
cd frontend
npm run lint
npm run build
```

Check backend health:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing
```

## Troubleshooting

### Ollama embedding errors

Make sure Ollama is running and the model is installed:

```powershell
ollama pull nomic-embed-text:latest
ollama list
```

### Supabase not connected

Check `backend\.env`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Also confirm the SQL scripts were run in order.

### Groq not enabled

Check `backend\.env`:

```env
GROQ_API_KEYS=your_key_1,your_key_2
```

The backend accepts either comma-separated `GROQ_API_KEYS` or aliases such as `GROQ_API_KEY1`, `GROQ_API_KEY2`, and so on.

### Frontend cannot reach backend

Check `frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Then restart `npm run dev`.

## Documentation

- [Full HTML explainer](docs/flow360-explainer.html)
- [Architecture walkthrough](docs/architecture_walkthrough.md)
- [Demo script](docs/demo_script.md)
- [Setup guide](docs/setup.md)

## Security Notes

- Real API keys must stay in `.env` files only.
- `.env`, `.env.local`, and similar files are ignored by git.
- `.env.example` files are safe templates and are committed.
- Regenerate any keys that were exposed during development before submitting this repository.

## License

Hackathon prototype. Add a production license before using this in a commercial setting.
