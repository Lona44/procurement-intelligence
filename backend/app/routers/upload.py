"""CSV/XLSX upload endpoint."""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.data_processor import process_file
from app.services.session_store import save_session, get_session, list_sessions
from app.models.schemas import UploadResponse, DataSummary

logger = logging.getLogger("arena.upload")
router = APIRouter()

ALLOWED_EXTENSIONS = (".csv", ".xlsx")


@router.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        logger.warning("Rejected upload: %s", file.filename)
        raise HTTPException(status_code=400, detail="Please upload a CSV or XLSX file")

    content = await file.read()

    try:
        df, summary = process_file(content, file.filename)
    except ValueError as e:
        logger.error("Validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.error("Parse failure for %s", file.filename, exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to parse file")

    # Store CSV text for agent analysis (convert XLSX to CSV for downstream use)
    csv_text = df.to_csv(index=False)

    session_id = str(uuid.uuid4())
    save_session(session_id, {
        "csv_text": csv_text,
        "summary": summary,
        "filename": file.filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info("Session %s created — %d rows, $%.2f total spend", session_id, summary.row_count, summary.total_spend)

    return UploadResponse(
        session_id=session_id,
        row_count=summary.row_count,
        total_spend=summary.total_spend,
        date_range=summary.date_range,
        top_vendors=summary.top_vendors[:5],
        categories=summary.category_breakdown,
    )


@router.get("/api/summary/{session_id}", response_model=DataSummary)
async def get_summary(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    summary = session.get("summary")
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not available")
    return summary


@router.get("/api/sessions")
async def get_sessions():
    return {"sessions": list_sessions()}
