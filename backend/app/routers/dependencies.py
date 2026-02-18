"""Shared FastAPI dependencies for session-based routers."""

from fastapi import HTTPException

from app.services.session_store import get_session


def get_session_or_404(session_id: str) -> dict:
    """Fetch a session by ID or raise 404."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
