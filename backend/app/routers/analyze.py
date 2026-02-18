"""SSE streaming analysis endpoint using LangGraph."""

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.base import build_arena_graph
from app.routers.dependencies import get_session_or_404
from app.services.session_store import build_preference_context

logger = logging.getLogger("arena.analyze")
router = APIRouter()


@router.get("/api/analyze/{session_id}")
async def analyze(session_id: str):
    session = get_session_or_404(session_id)

    summary = session.get("active_summary") or session["summary"]
    preferences = build_preference_context(session_id)
    if preferences:
        logger.info("Session %s has preference context (%d chars)", session_id, len(preferences))
    logger.info("Starting arena analysis for session %s", session_id)

    # Ensure agent_results dict exists (preserve previous results during re-runs)
    if "agent_results" not in session:
        session["agent_results"] = {}

    async def event_stream():
        graph = build_arena_graph()

        initial_state = {
            "summary": summary.model_dump(),
            "preferences": preferences,
            "events": [],
        }

        try:
            async for chunk in graph.astream(initial_state, stream_mode="updates"):
                for _node_name, node_output in chunk.items():
                    for event in node_output.get("events", []):
                        if event.get("status") == "complete":
                            agent = event.get("agent", "?")
                            result = event.get("result", {})
                            savings = result.get("total_savings", 0)
                            logger.info("Agent '%s' complete — $%.2f total savings", agent, savings)
                            session["agent_results"][agent] = result
                        yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error("Graph execution error for session %s: %s", session_id, e, exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

        logger.info("Arena analysis finished for session %s", session_id)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
