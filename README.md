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

Upload a CSV or XLSX file, map columns to standard fields, preview data quality and summary stats with adjustable date filters, then watch three AI agents analyze it in real time via server-sent events. Compare their results side-by-side, vote on the recommendations you trust most, and export a PDF report.

---

## How It Works

```
Upload  ──>  Map Columns  ──>  Preview  ──>  Analyze  ──>  Vote  ──>  Export
 .csv/.xlsx    confirm fields    charts &     3 agents      pick the     PDF
               + data quality    date filter  stream SSE    best recs    report
```

| Agent | Strategy | Approach |
|-------|----------|----------|
| **Conservative** | Low risk, high confidence | Identifies safe, proven cost reductions with minimal disruption |
| **Aggressive** | High reward, bold moves | Pushes for maximum savings through vendor consolidation and renegotiation |
| **Balanced** | Risk-adjusted optimization | Weighs savings against implementation risk for practical recommendations |

Each agent independently analyzes your spend data using LangGraph-orchestrated workflows backed by OpenAI, then presents ranked recommendations with estimated savings, confidence scores, and pros/cons.

When you vote on recommendations and re-run the analysis, agents shift their focus toward topics you cared about — without losing their distinct risk personalities.

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
└───────────────────┬──────────────────────────────────┘
                    │ REST + SSE
┌───────────────────┴──────────────────────────────────┐
│  Backend (FastAPI)                                    │
│  ├── /api/upload           Parse & suggest mappings  │
│  ├── /api/confirm-mappings Apply mappings & summarize│
│  ├── /api/summary          Date-filtered stats       │
│  ├── /api/analyze          SSE agent stream          │
│  ├── /api/vote             Recommendation votes      │
│  ├── /api/report           PDF export (GET)          │
│  └── /api/sessions         Session history + delete  │
│                                                      │
│  LangGraph agents ─ OpenAI ─ Pandas ─ fpdf2          │
└──────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- An OpenAI API key (optional — mock mode works without one)

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

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...          # Optional if using mock mode
MOCK_AGENTS=true               # Set to false to use real OpenAI calls
OPENAI_MODEL=gpt-4o-mini       # Model for agent analysis
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

Open [http://localhost:3000](http://localhost:3000) and upload a spend file to get started.

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
│   │   │   ├── report.py      # PDF report export
│   │   │   └── vote.py        # Voting endpoint
│   │   ├── services/
│   │   │   ├── data_processor.py    # Pandas CSV analysis + column mapping
│   │   │   ├── session_store.py     # In-memory state + preference builder
│   │   │   └── report_generator.py  # PDF generation with fpdf2
│   │   ├── config.py          # Environment & app constants
│   │   └── main.py            # FastAPI app entrypoint
│   ├── requirements.txt
│   └── pyproject.toml         # Ruff & mypy configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── upload/        # File upload + session history
│   │   │   ├── preview/       # Column mapping + data overview
│   │   │   └── arena/         # Agent arena + export
│   │   ├── components/        # React components
│   │   ├── lib/               # API client, SSE client, constants
│   │   ├── store/             # Jotai state atoms
│   │   └── types/             # TypeScript interfaces
│   ├── tailwind.config.ts
│   └── package.json
│
├── .github/
│   ├── workflows/ci.yml       # Lint, typecheck, build, security audit
│   └── dependabot.yml         # Automated dependency updates
│
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

**Backend:**

| Command | Description |
|---------|-------------|
| `ruff check .` | Lint Python code |
| `ruff format .` | Format Python code |
| `mypy app/ --ignore-missing-imports` | Type check Python code |

### Pre-commit Hooks

Enable local lint checks that run automatically before each commit:

```bash
git config core.hooksPath .githooks
```

This runs Ruff (backend) and ESLint + Prettier + TypeScript (frontend) checks before every commit, preventing lint errors from reaching the repo.

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
| **AI Orchestration** | LangGraph, OpenAI API |
| **Data Processing** | Pandas, openpyxl |
| **PDF Reports** | fpdf2 |
| **CI/CD** | GitHub Actions, Dependabot |
| **Linting** | ESLint + Prettier (frontend), Ruff + mypy (backend) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key for agent analysis |
| `MOCK_AGENTS` | `true` | Use synthetic agent responses (no API calls) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `OPENAI_TEMPERATURE` | `0.7` | Model temperature for generation |
| `CORS_ORIGINS` | — | Comma-separated allowed origins (for production) |
| `CORS_ORIGIN_REGEX` | `^http://localhost:\d+$` | Regex for allowed origins (any localhost port by default) |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please ensure all CI checks pass before requesting review. Run `npm run lint && npm run typecheck && npm run format:check` locally to catch issues early.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
