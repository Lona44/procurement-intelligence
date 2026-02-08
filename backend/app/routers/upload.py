"""CSV upload endpoint."""
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.data_processor import process_csv
from app.services.session_store import save_session, list_sessions
from app.models.schemas import UploadResponse

logger = logging.getLogger("arena.upload")
router = APIRouter()


@router.post("/api/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        logger.warning("Rejected non-CSV upload: %s", file.filename)
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    content = await file.read()
    csv_text = content.decode("utf-8")

    try:
        df, summary = process_csv(csv_text)
    except ValueError as e:
        logger.error("CSV validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.error("CSV parse failure for %s", file.filename, exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to parse CSV file")

    from datetime import datetime, timezone
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


@router.get("/api/sessions")
async def get_sessions():
    return {"sessions": list_sessions()}
