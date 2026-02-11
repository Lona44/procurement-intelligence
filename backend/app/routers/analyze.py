"""SSE streaming analysis endpoint using LangGraph."""

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.base import build_arena_graph
from app.services.session_store import build_preference_context, get_session

logger = logging.getLogger("arena.analyze")
router = APIRouter()


@router.get("/api/analyze/{session_id}")
async def analyze(session_id: str):
    session = get_session(session_id)
    if not session:
        logger.warning("Analyze request for unknown session: %s", session_id)
        raise HTTPException(status_code=404, detail="Session not found")

    summary = session["summary"]
    preferences = build_preference_context(session_id)
    if preferences:
        logger.info("Session %s has preference context (%d chars)", session_id, len(preferences))
    logger.info("Starting arena analysis for session %s", session_id)

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
                            savings = event.get("result", {}).get("total_savings", 0)
                            logger.info("Agent '%s' complete — $%.2f total savings", agent, savings)
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
