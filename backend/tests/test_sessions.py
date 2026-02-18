"""Session management endpoint tests."""

import pytest
from httpx import AsyncClient


class TestSessionsEndpoint:
    """GET /api/sessions, DELETE /api/sessions/:id, GET /api/summary/:id tests."""

    @pytest.mark.asyncio
    async def test_list_returns_sessions_with_metadata(
        self, client: AsyncClient, demo_session: str
    ):
        """List sessions returns all sessions with expected metadata fields."""
        resp = await client.get("/api/sessions")
        assert resp.status_code == 200

        sessions = resp.json()["sessions"]
        assert len(sessions) >= 1

        session = sessions[0]
        assert "session_id" in session
        assert "filename" in session
        assert "created_at" in session
        assert "row_count" in session
        assert "total_spend" in session
        assert "vote_count" in session
        assert "has_report" in session

    @pytest.mark.asyncio
    async def test_delete_removes_from_store(self, client: AsyncClient, demo_session: str):
        """Delete removes session from store."""
        resp = await client.delete(f"/api/sessions/{demo_session}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

        # Verify it's gone
        resp = await client.get("/api/sessions")
        session_ids = [s["session_id"] for s in resp.json()["sessions"]]
        assert demo_session not in session_ids

    @pytest.mark.asyncio
    async def test_summary_date_filter(self, client: AsyncClient):
        """Summary with date filter returns fewer rows (or error if no data)."""
        # Upload a real CSV so we have mapped_df
        from .conftest import sample_csv_bytes

        content = sample_csv_bytes()
        upload_resp = await client.post(
            "/api/upload",
            files={"file": ("test.csv", content, "text/csv")},
        )
        session_id = upload_resp.json()["session_id"]

        # Confirm mappings
        await client.post(
            "/api/confirm-mappings",
            json={
                "session_id": session_id,
                "mappings": {
                    "date": "date",
                    "vendor": "vendor",
                    "category": "category",
                    "amount": "amount",
                    "department": "department",
                },
            },
        )

        # Full summary
        full_resp = await client.get(f"/api/summary/{session_id}")
        assert full_resp.status_code == 200
        full_count = full_resp.json()["row_count"]

        # Filtered summary (only Q1)
        filtered_resp = await client.get(
            f"/api/summary/{session_id}",
            params={"start_date": "2024-01-01", "end_date": "2024-03-31"},
        )
        assert filtered_resp.status_code == 200
        filtered_count = filtered_resp.json()["row_count"]

        assert filtered_count < full_count
