"""Shared test fixtures for the backend test suite."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import session_store


@pytest.fixture
async def client():
    """Async HTTP client wired to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def _clean_sessions():
    """Reset session store between tests to avoid cross-test pollution."""
    yield
    session_store._sessions.clear()
    session_store._session_order.clear()
    session_store._votes.clear()
    session_store._voted_recommendations.clear()
