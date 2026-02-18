<p align="center">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/python-3.12-blue?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/node-20-green?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/next.js-14-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/fastapi-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <a href="https://github.com/Lona44/procurement-intelligence/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Lona44/procurement-intelligence/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
</p>

# Agent Arena

**AI-powered procurement spend analysis.** Three autonomous agents compete to find savings in your data — each with a different strategy, each fighting to deliver the best recommendations.

Upload a CSV or XLSX file, map columns to standard fields, preview data quality and summary stats with adjustable date filters, then watch three AI agents analyze it in real time via server-sent events. Compare their results side-by-side, vote on the recommendations you trust most, see your decision profile, and export a PDF report.

**Three ways to run it:**

1. **Mock mode** — no API keys needed, fully self-contained with synthetic agent responses
2. **Local with API keys** — add your OpenAI or Azure OpenAI key to `.env` and run on your own machine
3. **Cloud deployment** — deploy to Azure Container Apps using the included Docker + Bicep IaC templates

---

## How It Works

```
 Try Demo  ──>  Analyze  ──>  Vote  ──>  Insight  ──>  Export
  or upload      3 agents      pick the   decision       PDF
  .csv/.xlsx     stream SSE    best recs  profile        report
```

| Agent | Strategy | Approach |
|-------|----------|----------|
| **Conservative** | Low risk, high confidence | Identifies safe, proven cost reductions with minimal disruption |
| **Aggressive** | High reward, bold moves | Pushes for maximum savings through vendor consolidation and renegotiation |
| **Balanced** | Risk-adjusted optimization | Weighs savings against implementation risk for practical recommendations |

Each agent independently analyzes your spend data using LangGraph-orchestrated workflows backed by OpenAI (or Azure OpenAI), then presents ranked recommendations with estimated savings, confidence scores, and pros/cons.

When you vote on recommendations and re-run the analysis, agents shift their focus toward topics you cared about — without losing their distinct risk personalities. A **Behavioural Insight** card reveals your decision profile based on voting patterns.

---

## Demo Mode

Click **Try Demo** on the landing page to experience the full arena flow instantly — no file upload needed. The demo uses pre-seeded procurement data ($1.28M across 42 vendors, 5 categories, and 4 departments) so you can see agent analysis, voting, and PDF export working end to end.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Frontend (Next.js 14 / App Router)                  │
│  ├── /upload      File upload + session history      │
│  ├── /preview     Column mapping + data overview     │
│  └── /arena       SSE stream + agent cards + export  │
│                                                      │
│  Jotai atoms ─ Framer Motion ─ Recharts              │
│  Vitest + React Testing Library                      │
└───────────────────┬──────────────────────────────────┘
                    │ REST + SSE
┌───────────────────┴──────────────────────────────────┐
│  Backend (FastAPI)                                    │
│  ├── /api/upload           Parse & suggest mappings  │
│  ├── /api/confirm-mappings Apply mappings & summarize│
│  ├── /api/summary          Date-filtered stats       │
│  ├── /api/demo/start       Demo with pre-seeded data │
│  ├── /api/analyze          SSE agent stream          │
│  ├── /api/vote             Recommendation votes      │
│  ├── /api/report           PDF export (GET)          │
│  └── /api/sessions         Session history + delete  │
│                                                      │
│  LangGraph ─ OpenAI / Azure OpenAI ─ Pandas ─ fpdf2  │
│  pytest + httpx                                      │
└──────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- No API key needed — mock mode is on by default

### 1. Clone & install

```bash
git clone https://github.com/Lona44/procurement-intelligence.git
cd procurement-intelligence
```

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**

```bash
cd frontend
npm install
```

### 2. Configure environment

Copy the example and adjust as needed:

```bash
cp backend/.env.example backend/.env
```

For **mock mode** (no API keys needed), the defaults are enough (`MOCK_AGENTS=true`). The arena will show a banner indicating mock results are in use. To use real AI:

```env
OPENAI_API_KEY=sk-...
MOCK_AGENTS=false
OPENAI_MODEL=gpt-4o-mini
```

To use **Azure OpenAI** instead (takes priority over standard OpenAI when set):

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
MOCK_AGENTS=false
```

> CORS is automatically configured to allow any `localhost` port during development. Set `CORS_ORIGINS` explicitly for production deployments.

### 3. Run

Start both servers (in separate terminals):

```bash
# Backend (port 8000)
cd backend
uvicorn app.main:app --reload

# Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — click **Try Demo** or upload a spend file.

### Alternative: Docker

Run both services with a single command:

```bash
docker compose up --build
```

This starts the backend on port 8000 and frontend on port 3000. Pass Azure/OpenAI environment variables through `docker-compose.yml` or a `.env` file in the project root.

---

## Cloud Deployment (Azure)

The `infra/` directory contains Bicep templates for deploying to Azure Container Apps. Because Next.js bakes `NEXT_PUBLIC_*` variables into the image at build time, deployment is a two-step process:

### Step 1: Deploy infrastructure + backend

```bash
# Create a resource group
az group create --name rg-arena --location australiaeast

# Deploy with a placeholder frontend image
az deployment group create \
  --resource-group rg-arena \
  --template-file infra/main.bicep \
  --parameters backendImage=myacr.azurecr.io/arena-backend:latest \
               frontendImage=mcr.microsoft.com/hello-world:latest \
               mockAgents=false \
               openaiApiKey=sk-...

# Grab the backend FQDN from the output
BACKEND_URL=$(az deployment group show \
  --resource-group rg-arena \
  --name main \
  --query properties.outputs.backendUrl.value -o tsv)
```

### Step 2: Build frontend with the backend URL and redeploy

```bash
# Build the frontend image with the real backend URL
docker build ./frontend \
  --build-arg NEXT_PUBLIC_API_URL=$BACKEND_URL \
  -t myacr.azurecr.io/arena-frontend:latest

# Push and update the deployment
docker push myacr.azurecr.io/arena-frontend:latest
az deployment group create \
  --resource-group rg-arena \
  --template-file infra/main.bicep \
  --parameters backendImage=myacr.azurecr.io/arena-backend:latest \
               frontendImage=myacr.azurecr.io/arena-frontend:latest \
               mockAgents=false \
               openaiApiKey=sk-...
```

This provisions:
- **Azure Container App** for the FastAPI backend
- **Azure Container App** for the Next.js frontend
- **Container Apps Environment** with Log Analytics
- Secrets management for API keys

> **Tip:** If you use a custom domain (e.g. `api.yourdomain.com`), you can skip the two-step process — just set `NEXT_PUBLIC_API_URL` to your known domain when building the frontend image.

---

## Testing

The project uses TDD with three test layers:

| Layer | Tool | Command |
|-------|------|---------|
| **Backend unit** | pytest + httpx | `cd backend && python -m pytest tests/ -v` |
| **Frontend unit** | Vitest + React Testing Library | `cd frontend && npx vitest run` |
| **E2E** | Playwright | `npx playwright test` (from root) |

**25 tests** cover the core features: Azure OpenAI client factory, demo route, landing page interactions, behavioural insight profiles, and API layer.

Run all unit tests:

```bash
cd backend && python -m pytest tests/ -v
cd ../frontend && npx vitest run
```

---

## Project Structure

```
agent-arena-battle/
├── backend/
│   ├── app/
│   │   ├── agents/            # LangGraph agent definitions & prompts
│   │   ├── models/            # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── upload.py      # CSV upload, column mapping, date filter, sessions
│   │   │   ├── analyze.py     # SSE streaming endpoint
│   │   │   ├── demo.py        # Demo route with pre-seeded data
│   │   │   ├── report.py      # PDF report export
│   │   │   ├── vote.py        # Voting endpoint
│   │   │   └── dependencies.py # Shared FastAPI dependencies
│   │   ├── services/
│   │   │   ├── data_processor.py    # Pandas CSV analysis + column mapping
│   │   │   ├── session_store.py     # In-memory state + preference builder
│   │   │   └── report_generator.py  # PDF generation with fpdf2
│   │   ├── config.py          # Environment & app constants
│   │   └── main.py            # FastAPI app entrypoint
│   ├── data/
│   │   └── demo_summary.py    # Pre-built DataSummary for demo mode
│   ├── tests/                 # pytest test suite
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml         # Ruff, mypy & pytest configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── page.tsx       # Landing page (Try Demo + Get Started)
│   │   │   ├── upload/        # File upload + session history
│   │   │   ├── preview/       # Column mapping + data overview
│   │   │   └── arena/         # Agent arena + export
│   │   ├── components/
│   │   │   ├── BehaviouralInsight.tsx  # Vote-driven decision profile
│   │   │   └── ...            # Agent cards, charts, vote panel, etc.
│   │   ├── lib/               # API client, SSE client, constants
│   │   ├── store/             # Jotai state atoms
│   │   ├── test/              # Vitest test suite + mocks
│   │   └── types/             # TypeScript interfaces
│   ├── Dockerfile
│   ├── vitest.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── e2e/                       # Playwright E2E tests
├── infra/
│   ├── main.bicep             # Azure Container Apps IaC
│   └── main.bicepparam        # Default parameters
│
├── .github/
│   ├── workflows/ci.yml       # Lint, typecheck, test, build, security audit
│   └── dependabot.yml         # Automated dependency updates
│
├── docker-compose.yml         # Local multi-container setup
├── playwright.config.ts
├── TECHNICAL_WALKTHROUGH.md   # Detailed tech stack walkthrough
└── README.md
```

---

## Development

### Available Scripts

**Frontend:**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run typecheck` | TypeScript type checking |
| `npm run format` | Prettier format all files |
| `npm run format:check` | Check formatting without writing |
| `npx vitest run` | Run unit tests |
| `npx vitest --watch` | Run tests in watch mode |

**Backend:**

| Command | Description |
|---------|-------------|
| `python -m pytest tests/ -v` | Run unit tests |
| `ruff check .` | Lint Python code |
| `ruff format .` | Format Python code |
| `mypy app/ --ignore-missing-imports` | Type check Python code |

**E2E (from project root):**

| Command | Description |
|---------|-------------|
| `npx playwright test` | Run E2E tests (starts both servers automatically) |
| `npx playwright test --ui` | Run E2E tests with interactive UI |

### Pre-commit Hooks

Enable local lint checks that run automatically before each commit:

```bash
git config core.hooksPath .githooks
```

This runs Ruff + mypy (backend) and ESLint + Prettier + TypeScript (frontend) checks before every commit, preventing lint errors from reaching the repo.

### CI Pipeline

Every push and PR to `main` runs:

- **Frontend:** ESLint + Prettier check, TypeScript type check, production build
- **Backend:** Ruff lint + format check, mypy type check
- **Security:** `npm audit` + `pip-audit` dependency scans

All GitHub Actions are pinned to full SHA hashes for supply-chain security.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, Framer Motion |
| **Charts** | Recharts |
| **State** | Jotai (atomic state management) |
| **Backend** | FastAPI, Pydantic v2 |
| **AI Orchestration** | LangGraph, OpenAI API / Azure OpenAI |
| **Data Processing** | Pandas, openpyxl |
| **PDF Reports** | fpdf2 |
| **Testing** | pytest, Vitest, React Testing Library, Playwright |
| **Containers** | Docker, Docker Compose |
| **Cloud IaC** | Azure Bicep (Container Apps) |
| **CI/CD** | GitHub Actions, Dependabot |
| **Linting** | ESLint + Prettier (frontend), Ruff + mypy (backend) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key (not needed in mock mode) |
| `MOCK_AGENTS` | `true` | Use synthetic agent responses (no API calls, fully offline) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `OPENAI_TEMPERATURE` | `0.7` | Model temperature for generation |
| `AZURE_OPENAI_ENDPOINT` | — | Azure OpenAI endpoint (takes priority over standard OpenAI) |
| `AZURE_OPENAI_API_KEY` | — | Azure OpenAI API key |
| `AZURE_OPENAI_API_VERSION` | `2024-10-21` | Azure OpenAI API version |
| `AZURE_OPENAI_DEPLOYMENT` | — | Azure OpenAI deployment/model name |
| `CORS_ORIGINS` | — | Comma-separated allowed origins (for production) |
| `CORS_ORIGIN_REGEX` | `^http://localhost:\d+$` | Regex for allowed origins (any localhost port by default) |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Write tests first (TDD) and ensure they fail before implementing
4. Implement your changes and verify all tests pass
5. Commit your changes (`git commit -m "Add your feature"`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Open a Pull Request

Please ensure all CI checks pass before requesting review. Run locally:

```bash
cd backend && python -m pytest tests/ -v && ruff check . && ruff format --check .
cd ../frontend && npx vitest run && npm run lint && npm run typecheck && npm run format:check
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
