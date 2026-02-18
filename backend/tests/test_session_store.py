"""Session store tests — CRUD, eviction, voting, and preference learning."""

from unittest.mock import patch

from app.services.session_store import (
    add_vote,
    build_preference_context,
    delete_session,
    get_session,
    get_votes,
    save_session,
)


class TestSessionCRUD:
    """Basic session store operations."""

    def test_save_get_roundtrip(self):
        """Save then get returns the same data."""
        data = {"filename": "test.csv", "summary": "test"}
        save_session("sess-1", data)

        result = get_session("sess-1")
        assert result is not None
        assert result["filename"] == "test.csv"

    def test_lru_eviction(self):
        """Oldest session evicted when exceeding MAX_SESSIONS."""
        with patch("app.services.session_store.MAX_SESSIONS", 2):
            save_session("old", {"filename": "old.csv"})
            save_session("mid", {"filename": "mid.csv"})
            save_session("new", {"filename": "new.csv"})

            # old should be evicted
            assert get_session("old") is None
            assert get_session("mid") is not None
            assert get_session("new") is not None

    def test_delete_clears_votes_and_recommendations(self):
        """Delete removes session, votes, and voted recommendations."""
        save_session("del-1", {"filename": "del.csv"})
        add_vote("del-1", "conservative", "r1", "Title", "Desc")

        assert get_votes("del-1")["conservative"] == 1

        result = delete_session("del-1")
        assert result is True

        assert get_session("del-1") is None
        assert get_votes("del-1") == {"conservative": 0, "aggressive": 0, "balanced": 0}


class TestVoting:
    """Vote tracking and preference context."""

    def test_add_vote_initializes_and_increments(self):
        """First vote initializes defaults, subsequent votes increment."""
        save_session("vote-1", {"filename": "test.csv"})

        tallies = add_vote("vote-1", "conservative", "r1", "Title 1", "Desc 1")
        assert tallies["conservative"] == 1
        assert tallies["aggressive"] == 0
        assert tallies["balanced"] == 0

        tallies = add_vote("vote-1", "conservative", "r2", "Title 2", "Desc 2")
        assert tallies["conservative"] == 2

    def test_preference_context_empty_when_no_votes(self):
        """No votes returns empty preference context string."""
        save_session("pref-1", {"filename": "test.csv"})
        context = build_preference_context("pref-1")
        assert context == ""

    def test_preference_context_includes_voted_titles(self):
        """After voting, preference context includes recommendation titles."""
        save_session("pref-2", {"filename": "test.csv"})
        add_vote("pref-2", "balanced", "b1", "Cloud Optimization", "Optimize cloud costs")

        context = build_preference_context("pref-2")
        assert "Cloud Optimization" in context
        assert "Optimize cloud costs" in context
        assert "upvoted" in context.lower()
