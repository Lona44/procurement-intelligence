"""PDF report export endpoint."""

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.models.schemas import DataSummary, ReportRequest
from app.services.report_generator import generate_report
from app.services.session_store import get_session

logger = logging.getLogger("arena.report")
router = APIRouter()


@router.post("/api/report/{session_id}")
async def export_report(session_id: str, req: ReportRequest):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    summary_data = session.get("active_summary") or session.get("summary")
    if not summary_data:
        raise HTTPException(status_code=400, detail="No summary available for this session")

    # summary_data may already be a DataSummary or a dict (depends on code path)
    summary = summary_data if isinstance(summary_data, DataSummary) else DataSummary(**summary_data)

    column_mappings: dict[str, str] = session.get("column_mappings", {})
    raw_columns: list[str] = session.get("raw_columns", [])
    filename: str = session.get("filename", "unknown.csv")
    created_at: str = session.get("created_at", "")

    logger.info("Generating PDF report for session %s", session_id)

    pdf_bytes = generate_report(
        filename=filename,
        created_at=created_at,
        summary=summary,
        column_mappings=column_mappings,
        raw_columns=raw_columns,
        agents=req.agents,
        voted_ids=req.voted_recommendation_ids,
    )

    safe_name = filename.rsplit(".", 1)[0] if "." in filename else filename

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_report.pdf"',
        },
    )
