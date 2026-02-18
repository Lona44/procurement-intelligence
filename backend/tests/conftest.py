"""Shared test fixtures for the backend test suite."""

import importlib
import json
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
import app.agents.base as agents_base
import app.config as config_mod
from app.services import session_store


@pytest.fixture
async def client():
    """Async HTTP client wired to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def _clean_sessions():
    """Reset session store, OpenAI client, and config between tests."""
    yield
    session_store._sessions.clear()
    session_store._session_order.clear()
    session_store._votes.clear()
    session_store._voted_recommendations.clear()
    # Reset OpenAI client singleton and reload config from .env
    # (Azure tests use importlib.reload with patched env, polluting module state)
    agents_base._openai_client = None
    importlib.reload(config_mod)
    importlib.reload(agents_base)


@pytest.fixture(autouse=True)
def _fast_thinking():
    """Make thinking steps instant and use mock agents by default.

    To run against the real OpenAI API, set USE_REAL_API=1:
        USE_REAL_API=1 python -m pytest tests/ -v
    """
    import os

    use_real = os.environ.get("USE_REAL_API", "").strip() in ("1", "true", "yes")
    patches = [
        patch("app.agents.base.THINKING_STEP_BASE_DELAY", 0),
        patch("app.agents.base.THINKING_STEP_JITTER", 1),
    ]
    if not use_real:
        patches.append(patch("app.agents.base.MOCK_AGENTS", True))

    for p in patches:
        p.start()
    yield
    for p in patches:
        p.stop()


@pytest.fixture
async def demo_session(client: AsyncClient) -> str:
    """Create a demo session and return the session_id."""
    resp = await client.post("/api/demo/start")
    assert resp.status_code == 200
    return resp.json()["session_id"]


@pytest.fixture
async def demo_with_analysis(client: AsyncClient, demo_session: str) -> str:
    """Create a demo session, consume the full SSE stream, and return the session_id."""
    async with client.stream("GET", f"/api/analyze/{demo_session}") as resp:
        async for _ in resp.aiter_lines():
            pass
    return demo_session


def sample_csv_bytes() -> bytes:
    """Return a valid 10-row CSV as bytes."""
    header = "date,vendor,category,amount,department"
    rows = [
        "2024-01-15,Acme Corp,IT,1500.00,Engineering",
        "2024-02-20,Globex,Marketing,2300.50,Marketing",
        "2024-03-10,Initech,Office Supplies,450.00,Operations",
        "2024-04-05,Umbrella Corp,IT,3200.00,Engineering",
        "2024-05-18,Acme Corp,IT,1800.00,Engineering",
        "2024-06-22,Globex,Marketing,2100.00,Marketing",
        "2024-07-30,Initech,Office Supplies,500.00,Operations",
        "2024-08-14,Umbrella Corp,IT,2900.00,Engineering",
        "2024-09-25,Acme Corp,IT,1650.00,Engineering",
        "2024-10-01,Globex,Marketing,2500.00,Marketing",
    ]
    return (header + "\n" + "\n".join(rows) + "\n").encode()


def parse_sse_events(text: str) -> list[dict]:
    """Parse raw SSE text into a list of event dicts."""
    events = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if line.startswith("data: "):
            payload = line[6:]
            events.append(json.loads(payload))
    return events
