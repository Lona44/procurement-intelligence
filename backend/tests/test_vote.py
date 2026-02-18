"""Vote endpoint tests."""

import pytest
from httpx import AsyncClient


class TestVoteEndpoint:
    """POST /api/vote and GET /api/votes tests."""

    @pytest.mark.asyncio
    async def test_cast_vote_returns_updated_tallies(self, client: AsyncClient, demo_session: str):
        """Casting a vote returns updated tallies."""
        resp = await client.post(
            "/api/vote",
            json={
                "session_id": demo_session,
                "agent_type": "conservative",
                "recommendation_id": "c1",
                "recommendation_title": "Test Rec",
                "recommendation_description": "Test Desc",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["votes"]["conservative"] == 1
        assert data["votes"]["aggressive"] == 0
        assert data["votes"]["balanced"] == 0

    @pytest.mark.asyncio
    async def test_missing_fields_returns_422(self, client: AsyncClient):
        """Missing required fields returns 422 validation error."""
        resp = await client.post(
            "/api/vote",
            json={
                "session_id": "some-session",
                "agent_type": "conservative",
                # missing: recommendation_id, recommendation_title, recommendation_description
            },
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_votes_returns_current_tallies(self, client: AsyncClient, demo_session: str):
        """GET votes returns current tallies."""
        # Cast a vote first
        await client.post(
            "/api/vote",
            json={
                "session_id": demo_session,
                "agent_type": "aggressive",
                "recommendation_id": "a1",
                "recommendation_title": "Test",
                "recommendation_description": "Desc",
            },
        )

        resp = await client.get(f"/api/votes/{demo_session}")
        assert resp.status_code == 200
        assert resp.json()["votes"]["aggressive"] == 1

    @pytest.mark.asyncio
    async def test_duplicate_rec_vote_tally_increments_but_rec_stored_once(
        self, client: AsyncClient, demo_session: str
    ):
        """Voting same rec twice: tally increments but rec stored once."""
        vote_payload = {
            "session_id": demo_session,
            "agent_type": "balanced",
            "recommendation_id": "b1",
            "recommendation_title": "Same Rec",
            "recommendation_description": "Same Desc",
        }

        resp1 = await client.post("/api/vote", json=vote_payload)
        assert resp1.json()["votes"]["balanced"] == 1

        resp2 = await client.post("/api/vote", json=vote_payload)
        assert resp2.json()["votes"]["balanced"] == 2

        # But preference context should only have it once
        from app.services.session_store import build_preference_context

        context = build_preference_context(demo_session)
        assert context.count("Same Rec") == 1

    @pytest.mark.asyncio
    async def test_default_zeros_for_new_session(self, client: AsyncClient, demo_session: str):
        """New session has zero votes for all agents."""
        resp = await client.get(f"/api/votes/{demo_session}")
        assert resp.status_code == 200
        votes = resp.json()["votes"]
        assert votes == {"conservative": 0, "aggressive": 0, "balanced": 0}
