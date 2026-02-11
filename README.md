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

Upload a CSV or XLSX file, preview your data, then watch three AI agents analyze it in real time via server-sent events. Compare their results side-by-side and vote on the recommendations you trust most.

---

## How It Works

```
Upload  ──>  Preview  ──>  Analyze  ──>  Vote
 .csv/.xlsx    charts &     3 agents      pick the best
               summary      stream SSE    recommendations
```

| Agent | Strategy | Approach |
|-------|----------|----------|
| **Conservative** | Low risk, high confidence | Identifies safe, proven cost reductions with minimal disruption |
| **Aggressive** | High reward, bold moves | Pushes for maximum savings through vendor consolidation and renegotiation |
| **Balanced** | Risk-adjusted optimization | Weighs savings against implementation risk for practical recommendations |

Each agent independently analyzes your spend data using LangGraph-orchestrated workflows backed by OpenAI, then presents ranked recommendations with estimated savings, confidence scores, and pros/cons.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (Next.js 14 / App Router)         │
│  ├── /upload      File upload + validation  │
│  ├── /preview     Data overview + confirm   │
│  └── /arena       SSE stream + agent cards  │
│                                             │
│  Jotai atoms ─ Framer Motion ─ Tremor charts│
└──────────────────┬──────────────────────────┘
                   │ REST + SSE
┌──────────────────┴──────────────────────────┐
│  Backend (FastAPI)                           │
│  ├── /api/upload       Parse & summarize    │
│  ├── /api/analyze      SSE agent stream     │
│  ├── /api/sessions     Session history      │
│  └── /api/vote         Recommendation votes │
│                                             │
│  LangGraph agents ─ OpenAI ─ Pandas         │
└─────────────────────────────────────────────┘
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
CORS_ORIGINS=http://localhost:3000
```

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
│   │   ├── agents/          # LangGraph agent definitions & prompts
│   │   ├── models/          # Pydantic schemas
│   │   ├── routers/         # FastAPI route handlers
│   │   ├── services/        # Data processing & analysis
│   │   ├── config.py        # Environment & app constants
│   │   └── main.py          # FastAPI app entrypoint
│   ├── requirements.txt
│   └── pyproject.toml       # Ruff & mypy configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities, constants, API client, SSE
│   │   ├── store/           # Jotai state atoms
│   │   └── types/           # TypeScript interfaces
│   ├── tailwind.config.ts
│   └── package.json
│
├── .github/
│   ├── workflows/ci.yml     # Lint, typecheck, build, security audit
│   └── dependabot.yml       # Automated dependency updates
│
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
| **Styling** | Tailwind CSS, Tremor (charts), Framer Motion |
| **State** | Jotai (atomic state management) |
| **Backend** | FastAPI, Pydantic v2 |
| **AI Orchestration** | LangGraph, OpenAI API |
| **Data Processing** | Pandas, openpyxl |
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
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

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
