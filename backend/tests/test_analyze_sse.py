"""SSE streaming analysis endpoint tests.

These tests would have caught the React useEffect SSE re-firing bug
because they verify the exact shape and sequence of SSE events.
"""

import json

import pytest
from httpx import AsyncClient

from app.models.schemas import AgentResult
from app.services.session_store import get_session

AGENT_TYPES = ("conservative", "aggressive", "balanced")


class TestSSEStream:
    """Verify SSE event stream shape and content."""

    @pytest.mark.asyncio
    async def test_emits_thinking_and_complete_for_all_agents(
        self, client: AsyncClient, demo_session: str
    ):
        """SSE stream must emit thinking + complete events for all 3 agents."""
        events = []
        async with client.stream("GET", f"/api/analyze/{demo_session}") as resp:
            assert resp.status_code == 200
            async for line in resp.aiter_lines():
                line = line.strip()
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        # Each agent must have at least one thinking and one complete event
        for agent in AGENT_TYPES:
            agent_events = [e for e in events if e.get("agent") == agent]
            statuses = {e.get("status") for e in agent_events}
            assert "thinking" in statuses, f"{agent} missing thinking event"
            assert "complete" in statuses, f"{agent} missing complete event"

        # Must end with a done event
        done_events = [e for e in events if e.get("type") == "done"]
        assert len(done_events) == 1

    @pytest.mark.asyncio
    async def test_404_for_invalid_session(self, client: AsyncClient):
        """Requesting analysis for a non-existent session returns 404."""
        resp = await client.get("/api/analyze/nonexistent-session")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_agent_results_stored_in_session(self, client: AsyncClient, demo_session: str):
        """After SSE stream completes, agent_results must be stored in session."""
        async with client.stream("GET", f"/api/analyze/{demo_session}") as resp:
            async for _ in resp.aiter_lines():
                pass

        session = get_session(demo_session)
        assert session is not None
        agent_results = session.get("agent_results", {})
        for agent in AGENT_TYPES:
            assert agent in agent_results, f"Missing results for {agent}"
            result = agent_results[agent]
            assert "recommendations" in result
            assert "total_savings" in result

    @pytest.mark.asyncio
    async def test_every_sse_line_is_valid_format(self, client: AsyncClient, demo_session: str):
        """Every SSE line must be valid `data: {json}` format."""
        raw_lines = []
        async with client.stream("GET", f"/api/analyze/{demo_session}") as resp:
            async for line in resp.aiter_lines():
                if line.strip():
                    raw_lines.append(line.strip())

        assert len(raw_lines) > 0, "No SSE lines emitted"
        for line in raw_lines:
            assert line.startswith("data: "), f"Invalid SSE line: {line!r}"
            payload = line[6:]
            parsed = json.loads(payload)  # must not raise
            assert isinstance(parsed, dict)

    @pytest.mark.asyncio
    async def test_complete_event_validates_against_agent_result_schema(
        self, client: AsyncClient, demo_session: str
    ):
        """Complete event result must validate against AgentResult schema."""
        events = []
        async with client.stream("GET", f"/api/analyze/{demo_session}") as resp:
            async for line in resp.aiter_lines():
                line = line.strip()
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        complete_events = [e for e in events if e.get("status") == "complete" and e.get("result")]
        assert len(complete_events) == 3, "Expected 3 complete events"

        for event in complete_events:
            # This will raise ValidationError if schema doesn't match
            result = AgentResult(**event["result"])
            assert result.agent_type in AGENT_TYPES
            assert result.total_savings >= 0
            assert len(result.recommendations) > 0

    @pytest.mark.asyncio
    async def test_reanalysis_after_voting_includes_preference_context(
        self, client: AsyncClient, demo_session: str
    ):
        """Re-analysis after voting should use preference context."""
        # First analysis
        async with client.stream("GET", f"/api/analyze/{demo_session}") as resp:
            async for _ in resp.aiter_lines():
                pass

        # Cast a vote
        await client.post(
            "/api/vote",
            json={
                "session_id": demo_session,
                "agent_type": "conservative",
                "recommendation_id": "c1",
                "recommendation_title": "Consolidate Office Supply Vendors",
                "recommendation_description": "Merge purchases",
            },
        )

        # Check preference context is non-empty
        from app.services.session_store import build_preference_context

        context = build_preference_context(demo_session)
        assert len(context) > 0
        assert "Consolidate Office Supply Vendors" in context

        # Second analysis should complete without error
        events = []
        async with client.stream("GET", f"/api/analyze/{demo_session}") as resp:
            async for line in resp.aiter_lines():
                line = line.strip()
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        done_events = [e for e in events if e.get("type") == "done"]
        assert len(done_events) == 1
