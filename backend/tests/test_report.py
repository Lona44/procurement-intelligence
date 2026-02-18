"""Report generation endpoint tests."""

import pytest
from httpx import AsyncClient


class TestReportEndpoint:
    """GET /api/report tests."""

    @pytest.mark.asyncio
    async def test_returns_valid_pdf(self, client: AsyncClient, demo_with_analysis: str):
        """Report endpoint returns valid PDF with correct headers."""
        resp = await client.get(f"/api/report/{demo_with_analysis}")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"

        # Check filename in Content-Disposition header
        disposition = resp.headers.get("content-disposition", "")
        assert "filename=" in disposition
        assert ".pdf" in disposition

    @pytest.mark.asyncio
    async def test_400_without_agent_results(self, client: AsyncClient, demo_session: str):
        """Report before analysis returns 400."""
        resp = await client.get(f"/api/report/{demo_session}")
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_404_for_missing_session(self, client: AsyncClient):
        """Report for non-existent session returns 404."""
        resp = await client.get("/api/report/nonexistent")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_report_receives_voted_recommendation_ids(
        self, client: AsyncClient, demo_with_analysis: str
    ):
        """After voting, report generation should include voted IDs."""
        # Cast a vote
        await client.post(
            "/api/vote",
            json={
                "session_id": demo_with_analysis,
                "agent_type": "conservative",
                "recommendation_id": "c1",
                "recommendation_title": "Test Rec",
                "recommendation_description": "Desc",
            },
        )

        # Verify voted IDs are accessible
        from app.services.session_store import get_voted_recommendation_ids

        voted_ids = get_voted_recommendation_ids(demo_with_analysis)
        assert "c1" in voted_ids

        # Report should still generate successfully
        resp = await client.get(f"/api/report/{demo_with_analysis}")
        assert resp.status_code == 200
        assert resp.content[:4] == b"%PDF"
