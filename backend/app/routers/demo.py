"""Demo router — lets users experience the arena without uploading data."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter

from app.services.session_store import save_session
from data.demo_summary import DEMO_SUMMARY

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/start")
async def start_demo():
    """Create a session pre-loaded with synthetic procurement data."""
    session_id = uuid.uuid4().hex[:12]
    summary = DEMO_SUMMARY

    save_session(
        session_id,
        {
            "filename": "demo-data.csv",
            "summary": summary,
            "created_at": datetime.now(tz=UTC).isoformat(),
            "demo": True,
        },
    )

    return {"session_id": session_id, "summary": summary.model_dump()}
