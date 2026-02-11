"""CSV/XLSX upload endpoint."""

import logging
import re
import uuid
from datetime import UTC, datetime

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.config import MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB
from app.models.schemas import ConfirmMappingsRequest, DataSummary, UploadResponse
from app.services.data_processor import (
    apply_mappings_and_summarize,
    compute_column_stats,
    parse_file,
    suggest_column_mappings,
    summarize_dataframe,
)
from app.services.session_store import delete_session, get_session, list_sessions, save_session

logger = logging.getLogger("arena.upload")
router = APIRouter()

ALLOWED_EXTENSIONS = (".csv", ".xlsx")

# Strip anything except alphanumerics, hyphens, underscores, dots, and spaces
_SAFE_FILENAME_RE = re.compile(r"[^\w\s\-.]", re.ASCII)


def _sanitize_filename(name: str) -> str:
    """Sanitize user-supplied filename for safe storage and display."""
    # Take only the basename to prevent path traversal
    basename = name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    clean = _SAFE_FILENAME_RE.sub("_", basename).strip(". ")
    return clean[:255] or "upload"


@router.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):  # noqa: B008
    if not file.filename or not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        logger.warning("Rejected upload: %s", file.filename)
        raise HTTPException(status_code=400, detail="Please upload a CSV or XLSX file")

    # Enforce file size limit
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB} MB.",
        )

    safe_filename = _sanitize_filename(file.filename)

    try:
        df = parse_file(content, file.filename)
    except ValueError as e:
        logger.warning("Validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Parse failure for %s", safe_filename, exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to parse file") from e

    columns = list(df.columns)
    suggested_mappings = suggest_column_mappings(columns)
    column_stats = compute_column_stats(df)

    session_id = str(uuid.uuid4())
    save_session(
        session_id,
        {
            "raw_df": df,
            "raw_columns": columns,
            "filename": safe_filename,
            "created_at": datetime.now(UTC).isoformat(),
        },
    )
    logger.info(
        "Session %s created — %d rows, %d columns",
        session_id,
        len(df),
        len(columns),
    )

    return UploadResponse(
        session_id=session_id,
        filename=safe_filename,
        row_count=len(df),
        columns=columns,
        suggested_mappings=suggested_mappings,
        column_stats=column_stats,
    )


@router.post("/api/confirm-mappings", response_model=DataSummary)
async def confirm_mappings(req: ConfirmMappingsRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    required_fields = {"date", "vendor", "category", "amount", "department"}
    provided = set(req.mappings.keys())
    if not required_fields.issubset(provided):
        missing = required_fields - provided
        raise HTTPException(
            status_code=400,
            detail=f"Missing required field mappings: {missing}",
        )

    raw_df = session.get("raw_df")
    if raw_df is None:
        raise HTTPException(status_code=400, detail="No raw data in session")

    df = raw_df.copy()

    try:
        df, summary = apply_mappings_and_summarize(df, req.mappings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Update session with confirmed data
    csv_text = df.to_csv(index=False)
    session["csv_text"] = csv_text
    session["mapped_df"] = df
    session["summary"] = summary

    logger.info(
        "Mappings confirmed for session %s — $%.2f total spend",
        req.session_id,
        summary.total_spend,
    )

    return summary


@router.get("/api/summary/{session_id}", response_model=DataSummary)
async def get_summary(
    session_id: str,
    start_date: str | None = Query(None),  # noqa: B008
    end_date: str | None = Query(None),  # noqa: B008
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # When no date filters, return the stored full summary
    if not start_date and not end_date:
        summary = session.get("summary")
        if not summary:
            raise HTTPException(status_code=404, detail="Summary not available")
        return summary

    # Date-filtered summary: use stored mapped DataFrame
    mapped_df: pd.DataFrame | None = session.get("mapped_df")
    if mapped_df is None:
        raise HTTPException(status_code=400, detail="No mapped data in session")

    df = mapped_df.copy()

    if start_date:
        start_dt = pd.to_datetime(start_date, errors="coerce")
        if pd.isna(start_dt):
            raise HTTPException(status_code=400, detail="Invalid start_date format")
        df = df[df["date"] >= start_dt]

    if end_date:
        end_dt = pd.to_datetime(end_date, errors="coerce")
        if pd.isna(end_dt):
            raise HTTPException(status_code=400, detail="Invalid end_date format")
        df = df[df["date"] <= end_dt]

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="No data in selected date range")

    return summarize_dataframe(df)


@router.delete("/api/sessions/{session_id}")
async def remove_session(session_id: str):
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted"}


@router.get("/api/sessions")
async def get_sessions():
    return {"sessions": list_sessions()}
