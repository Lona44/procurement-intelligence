"""Tests for the demo route (POST /api/demo/start).

Covers:
- Returns 200 with session_id and summary
- Summary matches DataSummary schema
- Session is saved in store with demo flag
- Summary has realistic non-zero data
"""

import pytest

from app.models.schemas import DataSummary
from app.services.session_store import get_session


@pytest.mark.asyncio
async def test_demo_start_returns_session_and_summary(client):
    """POST /api/demo/start returns a session_id and summary."""
    resp = await client.post("/api/demo/start")
    assert resp.status_code == 200

    data = resp.json()
    assert "session_id" in data
    assert "summary" in data
    assert isinstance(data["session_id"], str)
    assert len(data["session_id"]) > 0


@pytest.mark.asyncio
async def test_demo_summary_matches_schema(client):
    """The summary in the response is a valid DataSummary."""
    resp = await client.post("/api/demo/start")
    data = resp.json()

    # Should not raise validation errors
    summary = DataSummary(**data["summary"])
    assert summary.total_spend > 0
    assert summary.row_count > 0
    assert summary.unique_vendor_count > 0
    assert len(summary.top_vendors) > 0
    assert len(summary.category_breakdown) > 0
    assert len(summary.department_breakdown) > 0
    assert len(summary.monthly_trends) > 0


@pytest.mark.asyncio
async def test_demo_session_saved_with_demo_flag(client):
    """Session store contains the demo session with demo=True."""
    resp = await client.post("/api/demo/start")
    session_id = resp.json()["session_id"]

    session = get_session(session_id)
    assert session is not None
    assert session.get("demo") is True
    assert session.get("filename") == "demo-data.csv"
    assert session.get("summary") is not None


@pytest.mark.asyncio
async def test_demo_creates_unique_sessions(client):
    """Each demo start creates a new unique session."""
    resp1 = await client.post("/api/demo/start")
    resp2 = await client.post("/api/demo/start")
    assert resp1.json()["session_id"] != resp2.json()["session_id"]
