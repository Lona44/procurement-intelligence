# Agent Arena Battle - Technical Walkthrough

## What This Project Does

Three AI agents — Conservative, Aggressive, and Balanced — receive the same procurement spend data and race to find savings opportunities. They run in parallel, stream their progress live to the browser, and present competing recommendations side-by-side. Users vote on individual recommendations, and when the analysis is re-run, the agents shift their focus toward topics the user cared about — without losing their distinct risk personalities.

---

## Project Structure

```
agent-arena-battle/
├── backend/                          # Python FastAPI
│   ├── app/
│   │   ├── main.py                   # App entry, CORS, error handling
│   │   ├── config.py                 # Environment variables
│   │   ├── routers/
│   │   │   ├── upload.py             # CSV upload + session list endpoints
│   │   │   ├── analyze.py            # SSE streaming endpoint
│   │   │   └── vote.py               # Voting endpoint
│   │   ├── agents/
│   │   │   ├── base.py               # LangGraph definition + agent logic
│   │   │   └── prompts.py            # System prompts per agent persona
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic data models
│   │   └── services/
│   │       ├── data_processor.py     # Pandas CSV analysis
│   │       └── session_store.py      # In-memory state + preference builder
│   ├── data/
│   │   └── synthetic_spend.csv       # 300-row test dataset
│   └── scripts/
│       └── generate_data.py          # Dataset generator
├── frontend/                         # Next.js 14
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Landing page (upload + session list)
│       │   ├── arena/page.tsx        # Main arena view
│       │   ├── layout.tsx            # Root layout + Jotai provider
│       │   └── providers.tsx         # Client-side Jotai Provider wrapper
│       ├── components/
│       │   ├── FileUpload.tsx        # Drag-and-drop CSV upload
│       │   ├── SessionList.tsx       # Previous sessions list
│       │   ├── ArenaBoard.tsx        # 3-column agent layout
│       │   ├── AgentCard.tsx         # Single agent's full UI
│       │   ├── ProgressBar.tsx       # Animated progress bar
│       │   ├── RecommendationList.tsx # Recommendation cards with vote buttons
│       │   ├── VotePanel.tsx         # Per-recommendation vote button
│       │   └── ComparisonTable.tsx   # Side-by-side metrics table
│       ├── store/
│       │   └── atoms.ts             # Jotai atoms for all app state
│       ├── lib/
│       │   ├── sse.ts               # SSE client (connects to backend stream)
│       │   └── api.ts               # REST API client functions
│       └── types/
│           └── index.ts             # TypeScript type definitions
```

---

## Tech Stack: What We Used and Why

### 1. Python FastAPI (Backend Framework)

**Where:** `backend/app/main.py`, `backend/app/routers/*.py`

**Why FastAPI specifically:** The core requirement is streaming live progress from 3 agents running in parallel. FastAPI is built on Python's `asyncio`, which means it natively supports async endpoints, Server-Sent Events via `StreamingResponse`, and running multiple coroutines concurrently. Flask or Django would require bolt-on async support. FastAPI also has built-in Pydantic integration for request/response validation, which ties directly into the structured output requirement.

**How it's used:**
- `main.py` creates the app, configures CORS (so the Next.js frontend on port 3000 can call the backend on port 8000), and mounts three routers.
- `routers/upload.py` handles `POST /api/upload` — receives the CSV file, triggers Pandas processing, stores the session, and returns summary stats.
- `routers/analyze.py` handles `GET /api/analyze/{session_id}` — builds the LangGraph, executes it, and streams events as SSE.
- `routers/vote.py` handles `POST /api/vote` and `GET /api/votes/{session_id}` — records votes and returns tallies.

### 2. LangGraph (Agent Orchestration)

**Where:** `backend/app/agents/base.py`, lines 276-310

**Why LangGraph specifically:** The project needs 3 agents running in parallel, each with multiple sequential steps, streaming progress as each step completes. LangGraph models this naturally as a directed graph with fan-out (parallel branches) and fan-in (converge at the end). Each node in the graph is a discrete unit of work, and LangGraph's `astream()` method yields state updates as each node finishes — which maps directly to SSE events.

The alternative was raw `asyncio.gather()` with manual queues (which was the original implementation). LangGraph replaces that with a declarative graph structure that's easier to reason about, extend, and debug.

**How it's used:**

The graph has this structure:
```
START ─┬─> conservative_step_0 -> step_1 -> step_2 -> step_3 -> conservative_analyze ─┬─> END
       ├─> aggressive_step_0   -> step_1 -> step_2 -> step_3 -> aggressive_analyze   ─┤
       └─> balanced_step_0     -> step_1 -> step_2 -> step_3 -> balanced_analyze     ─┘
```

- **`ArenaState`** (line 23): A `TypedDict` with `summary` (the spend data), `preferences` (learned from votes), and `events` (an append-only list using `Annotated[list, operator.add]` so parallel branches can write to it without conflicts).
- **`_make_step_node()`** (line 212): Factory that creates a graph node for one "thinking" step. Each node sleeps briefly (simulating work), then returns an event dict that gets appended to state.
- **`_make_analyze_node()`** (line 237): Factory for the final node in each agent's chain. This is where the OpenAI API call happens (or mock results are returned). It reads `preferences` from state and passes them to the LLM.
- **`build_arena_graph()`** (line 276): Assembles the full graph. Loops over the three agent types, adds 5 nodes per agent (4 thinking steps + 1 analyze), and wires edges. The three `START -> *_step_0` edges create the fan-out that makes all three branches run in parallel.

**How streaming works:** In `routers/analyze.py` (line 38), the endpoint calls `graph.astream(initial_state, stream_mode="updates")`. This yields `{node_name: node_output}` dicts as each node completes. The router extracts events from each chunk and yields them as `data: {...}\n\n` SSE lines.

### 3. OpenAI API (LLM for Agent Reasoning)

**Where:** `backend/app/agents/base.py` (line 325, `_call_openai`), `backend/app/agents/prompts.py`

**Why OpenAI:** Each agent needs to analyze structured spend data and produce structured JSON recommendations. OpenAI's `response_format={"type": "json_object"}` guarantees valid JSON output, and `gpt-4o-mini` provides good analytical quality at low cost and latency. The system uses the standard OpenAI API (not Azure), called via the `openai` Python package's `AsyncOpenAI` client for non-blocking calls.

**How it's used:**

Each agent gets a different **system prompt** (`prompts.py`) that defines its personality and risk tolerance:
- **Conservative** (line 3): "Focus on LOW-RISK, proven strategies... Only recommend changes you're highly confident will succeed."
- **Aggressive** (line 33): "Go BOLD... Maximize potential savings even if the approach carries risk."
- **Balanced** (line 61): "Weigh risk versus reward... Mix safe bets with a few bold strategic moves."

All three prompts enforce the same JSON schema (with `id`, `title`, `description`, `estimated_savings`, `confidence`, `risk_level`, `pros`, `cons`), but each instructs the LLM to use different confidence ranges and risk levels.

The **user message** sent to each agent is identical — it's a text summary of the spend data computed by Pandas (top vendors, category breakdown, department breakdown, monthly trends, detected duplicate vendors). This means the only variable differentiating the three agents' outputs is the system prompt, which directly demonstrates how prompt engineering affects outcomes.

When preferences exist from previous votes, they're appended to the user message as an additional section. This tells the agent which topics the user cares about, while the system prompt (which is unchanged) maintains the agent's risk personality.

**Mock mode:** When `MOCK_AGENTS=true` or no API key is set, the system returns pre-written recommendations (defined in `base.py`, lines 59-205) so the full UI flow works without any API calls.

### 4. Pydantic (Structured Data Validation)

**Where:** `backend/app/models/schemas.py`

**Why Pydantic:** The LLM returns free-form JSON that needs to be validated against a strict schema before the frontend can render it. Pydantic models enforce types at runtime — if the LLM returns `"medium-high"` instead of `"medium"` for `risk_level`, Pydantic raises a `ValidationError` rather than passing bad data through. This was a real issue we hit and fixed with a sanitization step before validation.

**Key models:**
- **`Recommendation`** (line 13): Validates each recommendation with `Literal["low", "medium", "high"]` for risk levels, `float` for confidence scores, and `list[str]` for pros/cons.
- **`AgentResult`** (line 24): Wraps a list of recommendations with the agent type, total savings, and summary.
- **`DataSummary`** (line 48): The structured output from Pandas processing — total spend, vendor rankings, category breakdowns, monthly trends, and detected duplicate vendors.
- **`VoteRequest`** (line 31): Carries the recommendation's title and description along with the vote, so the preference system knows *what* the user liked, not just *which agent*.

### 5. Pandas (Data Processing)

**Where:** `backend/app/services/data_processor.py`

**Why Pandas:** Raw CSV data isn't useful to an LLM — it would consume too many tokens and the LLM would make arithmetic errors. Pandas pre-computes the statistics that matter: top vendors by spend, category breakdowns, monthly trends, and duplicate vendor detection. This transforms ~300 rows of raw transactions into a concise summary the LLM can reason about effectively.

**How it's used:**

`process_csv()` (line 25) does the following:
1. Reads the CSV with `pd.read_csv()`, normalizes column names to lowercase.
2. Validates that required columns exist (`date`, `vendor`, `category`, `amount`, `department`).
3. Computes aggregations: `df.groupby("vendor")["amount"].agg(["sum", "count"])` for top vendors, same pattern for categories and departments.
4. Computes monthly trends: `df.groupby("month")["amount"].sum()`.
5. Detects duplicate vendors using `difflib.SequenceMatcher` (line 9) — compares every pair of vendor names and flags those with >75% string similarity (catches "Staples" vs "Staples Express", "Zoom" vs "Zoom Video").

The output is a `DataSummary` Pydantic model that gets stored in the session and later serialized into the LLM prompt.

### 6. Synthetic Data Generator

**Where:** `backend/scripts/generate_data.py`

**Why synthetic data:** The brief requires intentional patterns for agents to discover. The generator embeds three specific patterns:
1. **Vendor consolidation opportunity:** 5 office supply vendors with similar names (Staples, Staples Express, Office Depot, Office Depot Online, OfficeMax).
2. **Cloud price creep:** Cloud service costs increase by 5% per month (`amount *= 1 + (month - 1) * 0.05`).
3. **Duplicate software licenses:** Both "Zoom" and "Zoom Video", "Slack" and "Slack Technologies" appear as separate vendors in different departments.

### 7. Next.js 14 with App Router (Frontend Framework)

**Where:** `frontend/src/app/`

**Why Next.js 14 App Router:** The App Router provides file-system routing (each folder = a route), server components by default (fast initial load), and client components where interactivity is needed. The two pages are:
- `/` (`page.tsx`): Landing page with upload and session list. Marked `"use client"` because it uses Jotai state and browser APIs.
- `/arena` (`arena/page.tsx`): The main analysis view. Wrapped in `<Suspense>` because `useSearchParams()` requires it in Next.js 14.

### 8. Jotai + atomFamily (Frontend State Management)

**Where:** `frontend/src/store/atoms.ts`

**Why Jotai over Redux/Zustand:** The challenge is managing state for 3 independent agents that update asynchronously from an SSE stream. Jotai's `atomFamily` creates a separate atom for each agent type using a single declaration:

```typescript
export const agentAtomFamily = atomFamily((type: AgentType) =>
  atom<AgentState>(defaultAgentState(type))
);
```

This means `agentAtomFamily("conservative")`, `agentAtomFamily("aggressive")`, and `agentAtomFamily("balanced")` each return an independent atom. When an SSE event arrives for the aggressive agent, only the aggressive atom updates, and only components subscribed to that atom re-render. There's no single monolithic state object where updating one agent's progress causes the other two agent cards to re-render.

**Other atoms:**
- `sessionIdAtom`: Current session ID (set after upload, read by SSE connection and vote calls).
- `votesAtom`: Per-agent vote tallies displayed in the UI.
- `votedRecsAtom`: Tracks which recommendations the user has already voted on (prevents duplicate votes client-side).
- `arenaStartedAtom`: Prevents the SSE connection from firing multiple times on re-renders.

### 9. Server-Sent Events (SSE) for Real-Time Streaming

**Where:** Backend: `backend/app/routers/analyze.py`. Frontend: `frontend/src/lib/sse.ts`

**Why SSE over WebSockets:** The data flow is strictly one-directional — backend pushes events to the frontend. SSE is simpler than WebSockets for this pattern: it uses plain HTTP, auto-reconnects, and doesn't require a separate protocol upgrade. The backend yields `data: {...}\n\n` lines from a `StreamingResponse`, and the frontend reads them with the Fetch API's `ReadableStream`.

**Backend side** (`analyze.py`, line 28): The `event_stream()` async generator builds a LangGraph, runs it with `astream()`, and yields each event as a JSON line. Events come in two types:
- `{"agent": "conservative", "status": "thinking", "step": "Analyzing...", "progress": 40}` — progress update
- `{"agent": "conservative", "status": "complete", "progress": 100, "result": {...}}` — final result with recommendations

**Frontend side** (`sse.ts`, line 5): `connectSSE()` opens a `fetch()` request to `/api/analyze/{session_id}`, gets a `ReadableStream`, and reads chunks in a loop. It buffers partial lines, splits on `\n`, and parses lines starting with `data: ` as JSON. Each parsed event is passed to the `onEvent` callback.

**Wiring it together** (`arena/page.tsx`, line 29): The `handleEvent` callback receives each SSE event, looks up which agent it belongs to, and calls the corresponding Jotai setter. For "thinking" events, it appends the step to the agent's thinking log and updates progress. For "complete" events, it sets the recommendations, total savings, and summary.

---

## Data Flow: Step by Step

### Phase 1: Upload

```
User drops CSV  ──>  FileUpload.tsx  ──POST /api/upload──>  upload.py
                                                               │
                                                        data_processor.py
                                                        (Pandas analysis)
                                                               │
                                                        session_store.py
                                                        (save session)
                                                               │
                                                     Return { session_id,
                                                       row_count, total_spend }
                                                               │
FileUpload.tsx  <──────────────────────────────────────────────┘
     │
     └──>  router.push("/arena?session=xxx")
```

1. `FileUpload.tsx` sends the file as `FormData` via `POST /api/upload`.
2. `upload.py` reads the file bytes, decodes UTF-8, and calls `process_csv()`.
3. `data_processor.py` uses Pandas to compute `DataSummary` (top vendors, categories, trends, duplicates).
4. `session_store.py` saves the CSV text, summary, filename, and timestamp keyed by a UUID session ID.
5. The response includes the session ID; the frontend redirects to `/arena?session={id}`.

### Phase 2: Analysis (SSE Streaming)

```
arena/page.tsx mounts
     │
     └──>  connectSSE(sessionId)  ──GET /api/analyze/{id}──>  analyze.py
                                                                  │
                                                          build_arena_graph()
                                                          (LangGraph compiles)
                                                                  │
                                                          graph.astream(state)
                                                           ┌──────┼──────┐
                                                    conservative  aggressive  balanced
                                                    step_0        step_0      step_0
                                                    step_1        step_1      step_1
                                                    step_2        step_2      step_2
                                                    step_3        step_3      step_3
                                                    analyze       analyze     analyze
                                                    (OpenAI)      (OpenAI)    (OpenAI)
                                                           └──────┼──────┘
                                                                  │
                                                    Events streamed as nodes complete
                                                                  │
sse.ts  <──  "data: {...}\n\n"  <──────────────────────────────────┘
  │
  └──>  handleEvent()  ──>  agentAtomFamily setter  ──>  AgentCard re-renders
```

1. `arena/page.tsx` calls `connectSSE()` on mount.
2. `analyze.py` retrieves the session, calls `build_preference_context()` to check for vote history, builds the LangGraph, and starts streaming.
3. The LangGraph fans out from START to three parallel branches. Each branch has 4 thinking-step nodes (with delays) followed by 1 analyze node (OpenAI call).
4. As each node completes, `astream()` yields its output. The router extracts the event and writes it to the SSE stream.
5. `sse.ts` parses each line and calls `onEvent()`.
6. `handleEvent()` in `arena/page.tsx` dispatches to the correct Jotai atom setter based on `event.agent`.
7. The relevant `AgentCard` re-renders with the new progress/step/result.

### Phase 3: Voting + Preference Learning

```
User clicks Vote on a recommendation
     │
     └──>  VotePanel.tsx  ──POST /api/vote──>  vote.py
                                                  │
                                           session_store.py
                                           add_vote():
                                             - increment agent tally
                                             - store rec title + description
                                                  │
                                           Return { votes: tallies }
                                                  │
VotePanel.tsx  <──────────────────────────────────┘
  │
  └──>  setVotes() + setVotedRecs()  (update Jotai atoms)
```

### Phase 4: Re-run with Preferences

```
User clicks a previous session on landing page
     │
     └──>  SessionList.tsx  ──>  router.push("/arena?session=xxx")
                                        │
                              arena/page.tsx mounts, SSE connects
                                        │
                              analyze.py:
                                build_preference_context(session_id)
                                  │
                                  └──>  "The user previously upvoted:
                                         - Cloud Cost Optimization: ...
                                         - Consolidate Office Vendors: ...
                                         Prioritize these areas.
                                         Do NOT change your risk personality."
                                  │
                              This string is injected into state["preferences"]
                              and appended to the LLM user message
                                  │
                              Agents focus on voted topics but keep
                              their distinct risk approaches
```

The key design decision: preferences only inform **what topics** to focus on, not **how aggressive** to be. The system prompt (which controls the agent's personality) is never modified by votes. This prevents all three agents from converging to the same personality.

---

## Learning Outcomes: Where Each Is Demonstrated

### 1. Parallel Agent Orchestration

**Files:** `backend/app/agents/base.py` (lines 276-310), `backend/app/routers/analyze.py`

The LangGraph fan-out pattern (`builder.add_edge(START, first)` called three times) creates three concurrent execution branches. LangGraph manages the concurrency internally — each branch runs as a separate async coroutine. The `Annotated[list, operator.add]` type annotation on `ArenaState.events` lets all three branches append to the same list without race conditions.

### 2. Prompt Engineering Variations

**Files:** `backend/app/agents/prompts.py`

Three system prompts produce dramatically different outputs from the same data. The conservative prompt says "Only recommend changes you're highly confident will succeed" and produces 3 recommendations with 85-92% confidence. The aggressive prompt says "Maximize potential savings even if the approach carries risk" and produces 5 recommendations with 45-65% confidence. Same data, different framing — visible side-by-side in the UI.

### 3. Real-Time Streaming Architecture

**Files:** `backend/app/routers/analyze.py`, `frontend/src/lib/sse.ts`, `frontend/src/app/arena/page.tsx`

The full SSE pipeline: FastAPI `StreamingResponse` yields `data:` lines as LangGraph nodes complete -> `sse.ts` reads the response body as a stream, parsing chunks and buffering partial lines -> `handleEvent()` dispatches to per-agent Jotai atoms -> React re-renders only the affected AgentCard. The user sees interleaved progress from all three agents updating simultaneously.

### 4. Comparative Analysis UI

**Files:** `frontend/src/components/ArenaBoard.tsx`, `AgentCard.tsx`, `ComparisonTable.tsx`

`ArenaBoard` renders three `AgentCard` components in a CSS grid (`grid-cols-1 lg:grid-cols-3`). Each card independently shows its agent's status, progress, thinking log, and recommendations. `ComparisonTable` appears only when all three agents are complete (`allComplete` check) and renders a summary table comparing total savings, recommendation count, average confidence, and top recommendation across all three agents.

### 5. Agent Memory and Preferences

**Files:** `backend/app/services/session_store.py` (lines 89-105), `backend/app/routers/analyze.py` (line 23), `backend/app/agents/base.py` (line 242, 342)

The preference system has three parts:
1. **Storage** (`session_store.py`, `add_vote`): When a user votes on a recommendation, the title and description are stored alongside the session ID.
2. **Context building** (`session_store.py`, `build_preference_context`): Before re-analysis, this function assembles all voted recommendations into a natural-language instruction telling agents what to focus on.
3. **Injection** (`analyze.py`, line 23 and `base.py`, line 342): The preference string is added to the LangGraph state, and the analyze node appends it to the user message sent to OpenAI. The system prompt (agent personality) is never modified.

### 6. Structured Outputs with Pydantic

**Files:** `backend/app/models/schemas.py`, `backend/app/agents/base.py` (line 358)

Every LLM response passes through `AgentResult(**data)` which validates the JSON against the Pydantic schema. `Recommendation.risk_level` is `Literal["low", "medium", "high"]` — if the LLM returns anything else (like `"medium-high"`, which actually happened), a sanitization step (line 358) maps it to a valid value before Pydantic validation. This guarantees the frontend always receives well-typed data.

---

## Key Files Quick Reference

| File | Purpose | Key Function/Class |
|---|---|---|
| `backend/app/agents/base.py` | LangGraph definition, agent execution, OpenAI calls | `build_arena_graph()`, `_make_analyze_node()`, `_call_openai()` |
| `backend/app/agents/prompts.py` | Three distinct system prompts | `AGENT_PROMPTS` dict |
| `backend/app/models/schemas.py` | All Pydantic models | `Recommendation`, `AgentResult`, `DataSummary`, `VoteRequest` |
| `backend/app/services/data_processor.py` | Pandas CSV analysis | `process_csv()`, `find_duplicate_vendors()` |
| `backend/app/services/session_store.py` | Session/vote storage, preference builder | `add_vote()`, `build_preference_context()`, `list_sessions()` |
| `backend/app/routers/analyze.py` | SSE streaming endpoint | `analyze()` with `event_stream()` generator |
| `backend/app/routers/upload.py` | CSV upload + session list | `upload_csv()`, `get_sessions()` |
| `frontend/src/store/atoms.ts` | All Jotai state atoms | `agentAtomFamily`, `votesAtom`, `votedRecsAtom` |
| `frontend/src/lib/sse.ts` | SSE client | `connectSSE()` |
| `frontend/src/app/arena/page.tsx` | Arena page, SSE wiring, event dispatch | `handleEvent()` |
| `frontend/src/components/AgentCard.tsx` | Single agent's full UI | Renders progress, steps, results |
| `frontend/src/components/VotePanel.tsx` | Per-recommendation vote button | `handleVote()` sends title + description |
| `frontend/src/components/ComparisonTable.tsx` | Side-by-side comparison | Appears when all agents complete |

---

## How to Run

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev    # port 3000
```

**Configuration** (`backend/.env`):
```
OPENAI_API_KEY=sk-...       # Your OpenAI key
MOCK_AGENTS=false            # Set to "true" to skip OpenAI calls
OPENAI_MODEL=gpt-4o-mini    # Model to use
```

Open http://localhost:3000, upload `backend/data/synthetic_spend.csv`, and watch the agents compete.
