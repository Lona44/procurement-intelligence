# Agent Arena Battle - Technical Walkthrough

## What This Project Does

Three AI agents — Conservative, Aggressive, and Balanced — receive the same procurement spend data and race to find savings opportunities. They run in parallel, stream their progress live to the browser, and present competing recommendations side-by-side. Users vote on individual recommendations, and when the analysis is re-run, the agents shift their focus toward topics the user cared about — without losing their distinct risk personalities.

The full workflow: upload a CSV, map its columns to standard fields, preview data quality and summary statistics with adjustable date filters, launch the three-agent arena, vote on recommendations, and export a PDF report — all within one session that persists server-side.

---

## Project Structure

```
agent-arena-battle/
├── backend/                              # Python FastAPI
│   ├── app/
│   │   ├── main.py                       # App entry, CORS, router mounting
│   │   ├── config.py                     # Environment variables + defaults
│   │   ├── routers/
│   │   │   ├── upload.py                 # CSV upload, column mapping, date filter, sessions
│   │   │   ├── analyze.py                # SSE streaming endpoint
│   │   │   ├── report.py                 # PDF report export endpoint
│   │   │   └── vote.py                   # Voting endpoint
│   │   ├── agents/
│   │   │   ├── base.py                   # LangGraph definition + agent logic
│   │   │   └── prompts.py                # System prompts per agent persona
│   │   ├── models/
│   │   │   └── schemas.py                # Pydantic data models
│   │   └── services/
│   │       ├── data_processor.py         # Pandas CSV analysis + column mapping
│   │       ├── session_store.py          # In-memory state + preference builder
│   │       └── report_generator.py       # PDF generation with fpdf2
│   ├── data/
│   │   └── synthetic_spend.csv           # 300-row test dataset
│   └── scripts/
│       └── generate_data.py              # Dataset generator with embedded patterns
├── frontend/                             # Next.js 14
│   └── src/
│       ├── app/
│       │   ├── page.tsx                  # Landing page (hero + features)
│       │   ├── upload/page.tsx           # Upload page (file drop + session history)
│       │   ├── preview/page.tsx          # Column mapping + data overview
│       │   ├── arena/page.tsx            # Main arena view
│       │   ├── layout.tsx                # Root layout
│       │   └── providers.tsx             # Jotai Provider wrapper
│       ├── components/
│       │   ├── FileUpload.tsx            # Drag-and-drop CSV/XLSX upload
│       │   ├── ColumnMapping.tsx         # Interactive column mapper with confidence
│       │   ├── DataQualityTable.tsx      # Per-column stats (missing %, types, samples)
│       │   ├── DataOverview.tsx          # KPI cards + charts + date range filter
│       │   ├── SessionList.tsx           # Previous sessions with PDF download
│       │   ├── ArenaBoard.tsx            # 3-column agent layout
│       │   ├── AgentCard.tsx             # Single agent's full UI
│       │   ├── ProgressBar.tsx           # Animated progress bar
│       │   ├── RecommendationList.tsx    # Recommendation cards with vote buttons
│       │   ├── VotePanel.tsx             # Per-recommendation vote button
│       │   ├── ComparisonTable.tsx       # Side-by-side metrics table
│       │   └── ExportReportButton.tsx    # PDF export trigger
│       ├── store/
│       │   └── atoms.ts                 # Jotai atoms for all app state
│       ├── lib/
│       │   ├── sse.ts                   # SSE client (connects to backend stream)
│       │   ├── api.ts                   # REST API client functions
│       │   └── constants.ts             # API base URL, animation presets
│       └── types/
│           └── index.ts                 # TypeScript type definitions
```

---

## Tech Stack: How Each Technology Is Used

### 1. Python FastAPI (Backend Framework)

**Where:** `backend/app/main.py`, `backend/app/routers/*.py`

**Why FastAPI:** The core requirement is streaming live progress from 3 agents running in parallel. FastAPI is built on Python's `asyncio`, which means it natively supports async endpoints, Server-Sent Events via `StreamingResponse`, and running multiple coroutines concurrently. Flask or Django would require bolt-on async support. FastAPI also integrates Pydantic for request/response validation, which ties directly into the structured output requirement.

**How it's used:**

`main.py` creates the app, configures CORS (so the Next.js frontend on port 3000 can call the backend on port 8000), and mounts four routers:

- **`routers/upload.py`** — Five endpoints covering the entire pre-analysis flow:
  - `POST /api/upload` — receives CSV/XLSX files, parses with Pandas, computes column statistics and suggested mappings, stores the session, and returns an `UploadResponse` with column stats and mapping suggestions.
  - `POST /api/confirm-mappings` — accepts the user's column mapping choices, applies them to the raw DataFrame (renaming, type coercion), computes the full `DataSummary`, and stores the mapped data in the session.
  - `GET /api/summary/{session_id}` — returns the data summary, optionally filtered by `start_date` and `end_date` query parameters. When dates are provided, Pandas filters the stored DataFrame and recomputes all aggregations. The filtered summary is stored as `active_summary` so agents analyze the user's selected date range.
  - `GET /api/sessions` — returns metadata for all sessions (filename, row count, spend, vote count, whether agent results exist for PDF download).
  - `DELETE /api/sessions/{session_id}` — removes a session and all associated data.

- **`routers/analyze.py`** — `GET /api/analyze/{session_id}` builds the LangGraph, executes it, and streams events as SSE. When an agent completes, its result is stored in `session["agent_results"]` so the backend retains it for PDF export. On re-runs, existing results are preserved — each agent's result is overwritten only when its new result arrives, so a partial failure never wipes previous data.

- **`routers/report.py`** — `GET /api/report/{session_id}` reads agent results and voted recommendation IDs from the session, converts them to Pydantic models, and generates a PDF. Because everything is server-side, this is a simple GET — no payload needed from the frontend.

- **`routers/vote.py`** — `POST /api/vote` records a vote (agent tally + recommendation detail for preference learning) and `GET /api/votes/{session_id}` returns tallies.

### 2. LangGraph (Agent Orchestration)

**Where:** `backend/app/agents/base.py`

**Why LangGraph:** The project needs 3 agents running in parallel, each with multiple sequential steps, streaming progress as each step completes. LangGraph models this as a directed graph with fan-out (parallel branches) and fan-in (converge at end). Each node is a discrete unit of work, and `astream()` yields state updates as each node finishes — mapping directly to SSE events.

The alternative was raw `asyncio.gather()` with manual queues. LangGraph replaces that with a declarative graph structure that's easier to reason about, extend, and debug.

**The graph structure:**

```
START ─┬─> conservative_step_0 -> step_1 -> step_2 -> step_3 -> conservative_analyze ─┬─> END
       ├─> aggressive_step_0   -> step_1 -> step_2 -> step_3 -> aggressive_analyze   ─┤
       └─> balanced_step_0     -> step_1 -> step_2 -> step_3 -> balanced_analyze     ─┘
```

**Key components:**

- **`ArenaState`** — A `TypedDict` with `summary` (the spend data), `preferences` (learned from votes), and `events` (an append-only list using `Annotated[list, operator.add]` so parallel branches can write without conflicts).
- **`_make_step_node()`** — Factory that creates "thinking" step nodes. Each sleeps briefly (with jitter from config), then emits a progress event.
- **`_make_analyze_node()`** — Factory for the final node in each chain. This is where the OpenAI API call happens (or mock results are used). It reads `preferences` from state and passes them to the LLM.
- **`build_arena_graph()`** — Assembles the full graph. Three `START -> *_step_0` edges create the fan-out for parallel execution.

**How streaming works:** In `analyze.py`, the endpoint calls `graph.astream(initial_state, stream_mode="updates")`. This yields `{node_name: node_output}` dicts as each node completes. The router extracts events from each chunk and yields them as `data: {...}\n\n` SSE lines.

### 3. OpenAI API (LLM for Agent Reasoning)

**Where:** `backend/app/agents/base.py` (`_call_openai`), `backend/app/agents/prompts.py`

**Why OpenAI:** Each agent needs to analyze structured spend data and produce structured JSON recommendations. OpenAI's `response_format={"type": "json_object"}` guarantees valid JSON output, and `gpt-4o-mini` provides good analytical quality at low cost and latency. The `AsyncOpenAI` client makes non-blocking calls that integrate cleanly with LangGraph's async execution.

**How it's used:**

Each agent gets a different **system prompt** (`prompts.py`) that defines its personality:
- **Conservative:** "Focus on LOW-RISK, proven strategies... Only recommend changes you're highly confident will succeed."
- **Aggressive:** "Go BOLD... Maximize potential savings even if the approach carries risk."
- **Balanced:** "Weigh risk versus reward... Mix safe bets with a few bold strategic moves."

All three enforce the same JSON schema (`id`, `title`, `description`, `estimated_savings`, `confidence`, `risk_level`, `pros`, `cons`) but instruct the LLM to use different confidence ranges and risk levels. The **user message** is identical across all three — a text summary of the spend data computed by Pandas. The only variable differentiating agent outputs is the system prompt, directly demonstrating how prompt engineering affects outcomes.

When preferences exist from previous votes, they're appended to the user message as an additional section. This tells agents which topics the user cares about while the system prompt (unchanged) maintains the agent's risk personality.

**Mock mode:** When `MOCK_AGENTS=true` or no API key is set, the system returns pre-written recommendations so the full UI flow works without any API calls.

### 4. Pydantic (Structured Data Validation)

**Where:** `backend/app/models/schemas.py`

**Why Pydantic:** The LLM returns free-form JSON that must be validated before the frontend renders it. Pydantic enforces types at runtime — if the LLM returns `"medium-high"` instead of `"medium"` for `risk_level`, Pydantic raises a `ValidationError`. This was a real issue fixed with a sanitization step before validation.

**Key models and where they're used:**

- **`Recommendation`** — Validates each recommendation: `Literal["low", "medium", "high"]` for risk levels, `float` for confidence, `list[str]` for pros/cons. Used by the LLM output parser and the PDF report generator.
- **`AgentResult`** — Wraps recommendations with agent type, total savings, and summary. Stored in the session during SSE streaming and re-hydrated in the report endpoint.
- **`DataSummary`** — Output from Pandas processing: total spend, vendor rankings, category/department breakdowns, monthly trends, duplicate vendors. Returned by the upload, confirm-mappings, and summary endpoints. Also read by the report generator for the cover page.
- **`UploadResponse`** — Returned after file upload: session ID, raw columns, suggested mappings with confidence scores, and per-column statistics.
- **`ColumnStats`** — Per-column data quality: dtype inference, missing count/percentage, unique count, sample values, min/max. Rendered by the `DataQualityTable` component.
- **`SuggestedMapping`** — Column-to-field mapping with confidence score. Drives the initial state of the `ColumnMapping` component.
- **`VoteRequest`** — Carries the recommendation's title and description along with the vote, so the preference system knows *what* the user liked, not just *which agent*.

### 5. Pandas (Data Processing & Filtering)

**Where:** `backend/app/services/data_processor.py`

**Why Pandas:** Raw CSV data isn't useful to an LLM — it would consume too many tokens and the LLM would make arithmetic errors. Pandas pre-computes the statistics that matter and handles column mapping, type coercion, and date-range filtering.

**How it's used across the pipeline:**

1. **File parsing** (`parse_file()`) — Reads CSV/XLSX with `pd.read_csv()` or `pd.read_excel()`, normalizes column names to lowercase. Validates against limits (500k rows, 200 columns).

2. **Column statistics** (`compute_column_stats()`) — For each column: infers dtype (boolean, numeric, date, or string), counts missing values and unique values, extracts 5 sample values (with formula-injection sanitization for values starting with `=`, `+`, `-`, `@`), and computes min/max for numeric and date columns. These stats power the `DataQualityTable` component.

3. **Column mapping suggestions** (`suggest_column_mappings()`) — Scores each raw column against keyword lists for the 5 required fields (date, vendor, category, amount, department). Scoring: exact match = 1.0, contains keyword or keyword contains column = 0.8, partial match on underscore-split parts = 0.6. Returns the highest-scoring column per field.

4. **Mapping application** (`apply_mappings_and_summarize()`) — Renames columns per the user's mapping, coerces types (amount to numeric with `fillna(0)`, date to datetime, strings filled with "Unknown"), and creates a `month` period column for trend analysis.

5. **Summary computation** (`summarize_dataframe()`) — Computes `DataSummary`: `df.groupby("vendor")["amount"].agg(["sum", "count"])` for top vendors, same pattern for categories and departments, monthly trends, and duplicate vendor detection.

6. **Duplicate vendor detection** — Normalizes vendor names (lowercase, strips business suffixes like Pty/Ltd/Inc/Corp, removes punctuation), then compares all pairs with `difflib.SequenceMatcher`. Similarity >= 88% triggers a flag. Capped at 500 vendors to prevent O(n²) performance issues.

7. **Date filtering** — When the summary endpoint receives `start_date`/`end_date` query parameters, Pandas filters the stored DataFrame (`df[df["date"] >= start_dt]`) and re-runs `summarize_dataframe()` on the filtered subset. The result is stored as `active_summary` so agents analyze only the selected date range.

### 6. fpdf2 (PDF Report Generation)

**Where:** `backend/app/services/report_generator.py`

**Why fpdf2:** Lightweight, pure-Python PDF library with no system dependencies (unlike WeasyPrint/wkhtmltopdf). Supports multi-cell text, tables, colour, and cell-level layout — enough for a professional report without pulling in a full rendering engine.

**Report structure:**

1. **Cover page** — Blue banner with filename and date, 2x2 KPI grid (total spend, transactions, date range, unique vendors), top vendors mini-table, and a callout box highlighting the primary recommendation.

2. **Executive summary** — Agent comparison table: each agent's total savings, recommendation count, average confidence, and risk profile — colour-coded per agent (teal for conservative, orange for aggressive, indigo for balanced).

3. **Per-agent sections** — Each agent gets a full page with: summary paragraph, then each recommendation rendered as a card with risk badge (colour-coded: green/amber/red), estimated savings, confidence bar, pros/cons side-by-side columns. Voted recommendations are highlighted with an emerald background.

4. **Methodology & Proof** — Column mappings table (showing which source column maps to which standard field), then Excel verification formulas (`SUMIF`, `COUNTA`, `SUMPRODUCT`) the reader can paste into the original spreadsheet to independently verify the numbers.

**Data flow:** The report endpoint reads `agent_results` and `voted_recommendation_ids` from the server-side session (no frontend data needed), converts dicts to `AgentResult` Pydantic models, and passes everything to `generate_report()`.

### 7. Next.js 14 with App Router (Frontend Framework)

**Where:** `frontend/src/app/`

**Why Next.js 14 App Router:** File-system routing (each folder = a route), server components by default (fast initial load), and client components where interactivity is needed.

**Pages and their roles:**

- **`/`** (`page.tsx`) — Landing page. Animated hero section with blur orbs in agent colours (teal, orange, indigo). Feature cards explaining each agent's strategy and a 4-step workflow visualization. Pure marketing — directs users to `/upload`.

- **`/upload`** (`upload/page.tsx`) — File upload with `FileUpload.tsx` (drag-and-drop, progress bar via XHR `upload.progress` events) and `SessionList.tsx` (previous sessions with PDF download buttons for completed analyses). On successful upload, redirects to `/preview`.

- **`/preview`** (`preview/page.tsx`) — Two-phase page:
  - **Phase 1 (unmapped):** `ColumnMapping.tsx` renders 5 dropdown selectors, pre-populated with the backend's suggested mappings. Each selector shows a confidence badge (green >= 80%, amber 60-80%, grey < 60%) and prevents duplicate column selection. `DataQualityTable.tsx` shows per-column stats below. On confirm, calls `POST /api/confirm-mappings`.
  - **Phase 2 (mapped):** `DataOverview.tsx` renders KPI cards (total spend, row count, unique vendors, date range), area chart for monthly trends, donut chart for category breakdown, and horizontal bar chart for department spend. Date range filter with two date inputs, 300ms debounce, and a reset button. Fetches `GET /api/summary/{id}?start_date=X&end_date=Y` on change. Navigates to `/arena` when ready.

- **`/arena`** (`arena/page.tsx`) — The main view. Connects SSE on mount, dispatches events to per-agent Jotai atoms. Renders `ArenaBoard` (3-column grid of `AgentCard` components), `ComparisonTable` (appears when all 3 complete), and `ExportReportButton` (appears when all 3 complete — one click triggers `GET /api/report/{id}` and downloads the PDF).

**Routing flow:** `/` → `/upload` → `/preview` → `/arena`. Session ID is carried via URL query params and Jotai atoms. The preview page handles session recovery — if a user returns with confirmed mappings, it skips straight to the data overview phase.

### 8. Jotai + atomFamily (Frontend State Management)

**Where:** `frontend/src/store/atoms.ts`

**Why Jotai over Redux/Zustand:** The challenge is managing state for 3 independent agents that update asynchronously from an SSE stream. Jotai's `atomFamily` creates a separate atom for each agent type:

```typescript
export const agentAtomFamily = atomFamily((type: AgentType) =>
  atom<AgentState>(defaultAgentState(type))
);
```

`agentAtomFamily("conservative")`, `agentAtomFamily("aggressive")`, and `agentAtomFamily("balanced")` each return an independent atom. When an SSE event arrives for the aggressive agent, only the aggressive atom updates, and only components subscribed to that atom re-render. No single monolithic state object where one agent's progress update forces the other two cards to re-render.

**All atoms and their consumers:**

| Atom | Type | Set by | Read by |
|------|------|--------|---------|
| `sessionIdAtom` | `string \| null` | FileUpload, SessionList | SSE connection, API calls, all pages |
| `agentAtomFamily(type)` | `AgentState` | SSE event handler | AgentCard, ExportReportButton, ComparisonTable |
| `votesAtom` | `Votes` | VotePanel (after API response) | AgentCard (vote tallies) |
| `votedRecsAtom` | `VotedRec[]` | VotePanel | VotePanel (disable duplicate votes) |
| `arenaStartedAtom` | `boolean` | Arena page on mount | Arena page (prevent re-connection) |
| `dataSummaryAtom` | `DataSummary \| null` | Preview page, DataOverview | DataOverview (KPI cards, charts) |
| `uploadMetaAtom` | `UploadResponse \| null` | FileUpload | Preview page (columns, stats, mappings) |
| `mappingsConfirmedAtom` | `boolean` | ColumnMapping on confirm | Preview page (phase toggle) |

### 9. Server-Sent Events (SSE) for Real-Time Streaming

**Where:** Backend: `backend/app/routers/analyze.py`. Frontend: `frontend/src/lib/sse.ts`

**Why SSE over WebSockets:** The data flow is strictly one-directional — backend pushes events to the frontend. SSE is simpler: plain HTTP, auto-reconnects, no protocol upgrade. The backend yields `data: {...}\n\n` lines from a `StreamingResponse`, and the frontend reads them with the Fetch API's `ReadableStream`.

**Backend side** (`analyze.py`): The `event_stream()` async generator builds a LangGraph, runs it with `astream()`, and yields each event as a JSON line. Two event types:
- `{"agent": "conservative", "status": "thinking", "step": "Analyzing...", "progress": 40}` — progress
- `{"agent": "conservative", "status": "complete", "progress": 100, "result": {...}}` — final result

When a "complete" event passes through, the router also stores the result dict in `session["agent_results"][agent]`, persisting it server-side for later PDF export.

**Frontend side** (`sse.ts`): `connectSSE()` opens a `fetch()` to `/api/analyze/{session_id}`, gets a `ReadableStream`, and reads chunks in a loop. It buffers partial lines (since TCP chunks don't respect JSON boundaries), splits on `\n`, and parses lines starting with `data: ` as JSON. Each parsed event fires the `onEvent` callback. Returns a cleanup function (via `AbortController`) for unmount.

**Wiring** (`arena/page.tsx`): `handleEvent` receives each SSE event, dispatches to the correct `agentAtomFamily` setter. For "thinking" events: appends the step to the thinking log and updates the progress bar. For "complete" events: sets recommendations, total savings, and summary. The relevant `AgentCard` re-renders; the other two don't.

### 10. Recharts (Data Visualization)

**Where:** `frontend/src/components/DataOverview.tsx`

**Why Recharts:** React-native charting library that works with declarative JSX composition. No imperative DOM manipulation — chart components accept data as props and re-render on state changes, which fits naturally with Jotai atoms and the date-filter flow.

**Charts rendered:**
- **Area chart** — Monthly spend trends from `DataSummary.monthly_trends`. Stroke and fill use the indigo-500 palette. Responsive container adapts to parent width.
- **Donut chart** — Category breakdown from `DataSummary.category_breakdown`. Each slice is a category with its total spend.
- **Horizontal bar chart** — Department spend from `DataSummary.department_breakdown`. Sorted by total spend descending.

When the user adjusts the date range filter, the `dataSummaryAtom` updates with the filtered summary, and all three charts re-render with the new data.

### 11. Framer Motion (Animation)

**Where:** Throughout `frontend/src/components/*.tsx`

**Why Framer Motion:** Provides declarative animation primitives (`motion.div`, `AnimatePresence`) that integrate cleanly with React's component lifecycle. Used for:

- **Agent cards:** Staggered fade-in on mount (`initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}` with delay per index).
- **Progress bars:** Smooth width transitions as agent progress updates via SSE.
- **Session list items:** Staggered slide-in (`initial={{ opacity: 0, x: -8 }}`).
- **Buttons:** Tap feedback via `whileTap={{ scale: 0.97 }}` (defined in `ANIM.buttonTap` constants).
- **Page transitions:** Components animate in/out as the user moves between phases.

### 12. TypeScript (End-to-End Type Safety)

**Where:** `frontend/src/types/index.ts`, all `.tsx` and `.ts` files

**How it connects frontend to backend:**

The TypeScript interfaces in `types/index.ts` mirror the Pydantic models in `schemas.py`:

| Backend Pydantic Model | Frontend TypeScript Interface | Shared Fields |
|---|---|---|
| `Recommendation` | `Recommendation` | id, title, description, estimated_savings, confidence, risk_level, pros, cons |
| `AgentResult` | `AgentResult` | agent_type, recommendations, total_savings, summary |
| `DataSummary` | `DataSummary` | total_spend, row_count, date_range, top_vendors, category_breakdown, etc. |
| `UploadResponse` | `UploadResponse` | session_id, filename, row_count, columns, suggested_mappings, column_stats |
| `ColumnStats` | `ColumnStats` | name, dtype, total_count, missing_count, missing_pct, unique_count, sample_values |

The SSE event payloads are typed as `SSEEvent`, and the `AgentState` type tracks the full lifecycle of an agent (idle → thinking → complete → error) with discriminated status field.

### 13. Tailwind CSS (Styling)

**Where:** All frontend components

**How it's used:** Utility-first CSS framework applied directly in JSX. Key patterns:

- **Responsive grid:** `ArenaBoard` uses `grid-cols-1 lg:grid-cols-3` — single column on mobile, three-column layout on desktop.
- **Agent colour coding:** Each agent has a consistent colour throughout the UI: teal-500 for conservative, orange-500 for aggressive, indigo-500 for balanced. Applied via conditional classes on borders, badges, and accent elements.
- **Risk level colours:** Green for low risk, amber for medium, red for high — used in recommendation cards and the PDF report.
- **Interactive states:** `hover:shadow-md`, `hover:border-zinc-300`, `disabled:opacity-50` provide feedback without custom CSS.
- **Dark/light contrast:** The UI uses a zinc-based neutral palette (zinc-50 backgrounds, zinc-700 text, zinc-200 borders) for a clean, professional look.

---

## Data Flow: Step by Step

### Phase 1: Upload

```
User drops CSV  ──>  FileUpload.tsx  ──POST /api/upload──>  upload.py
                                                               │
                                                        parse_file()
                                                        compute_column_stats()
                                                        suggest_column_mappings()
                                                               │
                                                        session_store.save_session()
                                                               │
                                                     Return UploadResponse:
                                                       { session_id, columns,
                                                         suggested_mappings,
                                                         column_stats }
                                                               │
FileUpload.tsx  <──────────────────────────────────────────────┘
     │
     └──>  set uploadMetaAtom + sessionIdAtom
     └──>  router.push("/preview?session=xxx")
```

### Phase 2: Column Mapping + Data Preview

```
preview/page.tsx mounts (Phase 1: mapping)
     │
     └──>  ColumnMapping.tsx renders 5 dropdowns
           pre-filled with suggested_mappings
           confidence badges: green/amber/grey
                    │
           User adjusts mappings, clicks Confirm
                    │
           POST /api/confirm-mappings ──>  upload.py
                                              │
                                       apply_mappings_and_summarize()
                                       (rename cols, coerce types,
                                        compute DataSummary)
                                              │
           Return DataSummary  <──────────────┘
                    │
           set dataSummaryAtom + mappingsConfirmedAtom
                    │
preview/page.tsx switches to Phase 2: DataOverview
     │
     └──>  DataOverview.tsx renders:
           - KPI cards (total spend, rows, vendors, date range)
           - Area chart (monthly trends)
           - Donut chart (categories)
           - Bar chart (departments)
           - Date range filter
                    │
           User adjusts dates (300ms debounce)
                    │
           GET /api/summary/{id}?start_date=X&end_date=Y
                    │
           DataOverview re-renders with filtered data
```

### Phase 3: Analysis (SSE Streaming)

```
arena/page.tsx mounts
     │
     └──>  connectSSE(sessionId)  ──GET /api/analyze/{id}──>  analyze.py
                                                                  │
                                                     build_preference_context()
                                                     build_arena_graph()
                                                                  │
                                                     graph.astream(state)
                                                      ┌───────────┼───────────┐
                                               conservative   aggressive   balanced
                                               step_0         step_0       step_0
                                               step_1         step_1       step_1
                                               step_2         step_2       step_2
                                               step_3         step_3       step_3
                                               analyze        analyze      analyze
                                               (OpenAI)       (OpenAI)     (OpenAI)
                                                      └───────────┼───────────┘
                                                                  │
                                               Events streamed + results stored
                                               in session["agent_results"]
                                                                  │
sse.ts  <──  "data: {...}\n\n"  <─────────────────────────────────┘
  │
  └──>  handleEvent()  ──>  agentAtomFamily setter  ──>  AgentCard re-renders
```

### Phase 4: Voting + Preference Learning

```
User clicks Vote on a recommendation
     │
     └──>  VotePanel.tsx  ──POST /api/vote──>  vote.py
                                                  │
                                           session_store.add_vote():
                                             - increment agent tally
                                             - store rec title + description
                                                  │
                                           Return { votes: tallies }
                                                  │
VotePanel.tsx  <──────────────────────────────────┘
  │
  └──>  setVotes() + setVotedRecs()  (Jotai atoms)
```

On re-run, `build_preference_context()` assembles voted recommendations into a natural-language instruction: "The user previously upvoted: Cloud Cost Optimization, Consolidate Office Vendors... Prioritize these areas. Do NOT change your risk personality." This is injected into the LLM user message — the system prompt (agent personality) is never modified.

### Phase 5: PDF Export

```
User clicks Export PDF  ──>  ExportReportButton.tsx
     │
     └──>  GET /api/report/{session_id}  ──>  report.py
                                                  │
                                           Read from session:
                                             - agent_results (stored during SSE)
                                             - voted_recommendation_ids
                                             - summary, column_mappings, etc.
                                                  │
                                           report_generator.py:
                                             generate_report()
                                             - Cover page + KPIs
                                             - Executive summary table
                                             - Per-agent recommendation cards
                                             - Methodology + Excel formulas
                                                  │
                                           Return PDF bytes
                                                  │
ExportReportButton.tsx  <─────────────────────────┘
  │
  └──>  URL.createObjectURL(blob) → trigger download

Also available from SessionList.tsx for completed sessions
(has_report flag from list_sessions endpoint)
```

---

## Key Design Decisions

### Agent results stored server-side
When an agent completes during SSE streaming, its result is written to the session dict immediately. This means:
- The PDF report endpoint is a simple GET — no need for the frontend to POST agent data back.
- If the user leaves the arena page and returns later, results are still available.
- The sessions list can show a download button for any session with completed analysis.
- On re-runs, existing results are preserved per-agent (not wiped) so a partial failure never destroys previous data.

### Preferences inform topics, not personality
When a user votes on a recommendation, `add_vote()` stores the recommendation's **title and description** — not just which agent it came from. This means the system remembers *what* the user cared about, not just *who* they agreed with.

On re-run, `build_preference_context()` assembles all voted recommendations into a natural-language instruction appended to the **user message**:

```
The user has previously upvoted the following recommendations,
indicating areas they want you to focus on:
- Cloud Cost Optimization: Negotiate volume discounts with AWS...
- Consolidate Office Vendors: Merge Staples and Office Depot...

Prioritize analysis in these areas. Suggest deeper, more specific
strategies related to these topics. Do NOT change your risk tolerance
or personality — keep your unique perspective, but focus your attention
on the areas the user cares about most.
```

The critical design: this goes into the **user message**, while each agent's personality lives in the **system prompt** — and the system prompt is never modified by votes. This means preferences steer *what topics* agents focus on, not *how aggressive* they are.

For example, if the user votes on "Cloud Cost Optimization":
- **Conservative** might suggest locking in a 2-year AWS reserved instance commitment (low risk, high confidence)
- **Aggressive** might suggest migrating to a cheaper cloud provider entirely (high risk, bold savings)
- **Balanced** might suggest a hybrid — reserved instances for stable workloads, spot instances for burst capacity

All three focus on cloud costs because the preference told them to, but each applies its own risk lens because the system prompt is unchanged. This prevents all three agents from converging to the same personality.

### Column mapping before analysis
Rather than assuming CSV column names, the system suggests mappings with confidence scores and lets the user confirm or adjust. This makes the tool work with any CSV format, not just one with specific column names.

### Date filtering recomputes everything
When the user narrows the date range, Pandas re-runs the full aggregation pipeline on the filtered subset. The filtered `DataSummary` is stored as `active_summary` so when agents run, they analyze only the user's selected date range — not the full dataset.

---

## Key Files Quick Reference

| File | Purpose | Key Function/Class |
|---|---|---|
| `backend/app/agents/base.py` | LangGraph graph, agent nodes, OpenAI calls | `build_arena_graph()`, `_make_analyze_node()`, `_call_openai()` |
| `backend/app/agents/prompts.py` | Three distinct system prompts | `AGENT_PROMPTS` dict |
| `backend/app/models/schemas.py` | Pydantic models | `Recommendation`, `AgentResult`, `DataSummary`, `UploadResponse`, `ColumnStats` |
| `backend/app/services/data_processor.py` | Pandas CSV analysis, column mapping, date filtering | `parse_file()`, `suggest_column_mappings()`, `summarize_dataframe()` |
| `backend/app/services/session_store.py` | Session/vote storage, preference builder | `save_session()`, `add_vote()`, `build_preference_context()`, `get_voted_recommendation_ids()` |
| `backend/app/services/report_generator.py` | PDF generation with fpdf2 | `generate_report()`, `_render_cover()`, `_render_agent_section()`, `_render_methodology()` |
| `backend/app/routers/analyze.py` | SSE streaming + result persistence | `analyze()` with `event_stream()` generator |
| `backend/app/routers/upload.py` | Upload, mapping, filtering, sessions | `upload_csv()`, `confirm_mappings()`, `get_data_summary()` |
| `backend/app/routers/report.py` | PDF export endpoint | `export_report()` — GET, reads everything from session |
| `frontend/src/store/atoms.ts` | All Jotai state atoms | `agentAtomFamily`, `dataSummaryAtom`, `uploadMetaAtom` |
| `frontend/src/lib/sse.ts` | SSE client with chunk buffering | `connectSSE()` |
| `frontend/src/lib/api.ts` | REST API client | `uploadCSV()`, `confirmMappings()`, `exportReport()`, `castVote()` |
| `frontend/src/app/arena/page.tsx` | Arena page, SSE wiring | `handleEvent()` dispatches to per-agent atoms |
| `frontend/src/app/preview/page.tsx` | Column mapping + data overview | Two-phase UI with session recovery |
| `frontend/src/components/ColumnMapping.tsx` | Interactive column mapper | Confidence badges, duplicate detection |
| `frontend/src/components/DataOverview.tsx` | Charts + date filter | Recharts area/donut/bar, 300ms debounce |
| `frontend/src/components/AgentCard.tsx` | Single agent's full UI | Progress, thinking steps, recommendations |
| `frontend/src/components/ExportReportButton.tsx` | PDF export trigger | Simple GET call, no payload assembly |

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
