"""In-memory session and vote storage with preference learning."""

import logging
from typing import Any

from app.config import MAX_SESSIONS

logger = logging.getLogger("arena.store")

# session_id -> { "csv_text": str, "summary": DataSummary, "filename": str, "created_at": str }
_sessions: dict[str, dict[str, Any]] = {}

# Ordered list of session IDs (most recent first)
_session_order: list[str] = []

# session_id -> { agent_type: vote_count }
_votes: dict[str, dict[str, int]] = {}

# session_id -> list of voted recommendation details
_voted_recommendations: dict[str, list[dict[str, str]]] = {}


def _evict_oldest() -> None:
    """Remove the oldest session when the store exceeds MAX_SESSIONS."""
    while len(_session_order) > MAX_SESSIONS:
        old_id = _session_order.pop()
        _sessions.pop(old_id, None)
        _votes.pop(old_id, None)
        _voted_recommendations.pop(old_id, None)
        logger.info("Evicted old session %s (store capped at %d)", old_id, MAX_SESSIONS)


def save_session(session_id: str, data: dict[str, Any]) -> None:
    _sessions[session_id] = data
    _session_order.insert(0, session_id)
    _evict_oldest()


def get_session(session_id: str) -> dict[str, Any] | None:
    return _sessions.get(session_id)


def delete_session(session_id: str) -> bool:
    """Remove a session and all associated data. Returns True if it existed."""
    if session_id not in _sessions:
        return False
    _sessions.pop(session_id, None)
    _votes.pop(session_id, None)
    _voted_recommendations.pop(session_id, None)
    if session_id in _session_order:
        _session_order.remove(session_id)
    logger.info("Deleted session %s", session_id)
    return True


def add_vote(
    session_id: str,
    agent_type: str,
    recommendation_id: str,
    recommendation_title: str,
    recommendation_description: str,
) -> dict[str, int]:
    # Tally per-agent votes
    if session_id not in _votes:
        _votes[session_id] = {"conservative": 0, "aggressive": 0, "balanced": 0}
    _votes[session_id][agent_type] = _votes[session_id].get(agent_type, 0) + 1

    # Store recommendation detail for preference learning
    if session_id not in _voted_recommendations:
        _voted_recommendations[session_id] = []

    # Avoid duplicate votes on the same recommendation
    already_voted = any(
        r["recommendation_id"] == recommendation_id for r in _voted_recommendations[session_id]
    )
    if not already_voted:
        _voted_recommendations[session_id].append(
            {
                "recommendation_id": recommendation_id,
                "title": recommendation_title,
                "description": recommendation_description,
            }
        )
        logger.info(
            "Preference recorded for session %s: '%s'",
            session_id,
            recommendation_title,
        )

    return _votes[session_id]


def list_sessions() -> list[dict[str, Any]]:
    """Return metadata for all sessions, most recent first."""
    results = []
    for sid in _session_order:
        session = _sessions.get(sid)
        if not session:
            continue
        summary = session.get("summary")
        vote_count = sum(get_votes(sid).values())
        results.append(
            {
                "session_id": sid,
                "filename": session.get("filename", "unknown.csv"),
                "created_at": session.get("created_at", ""),
                "row_count": summary.row_count if summary else 0,
                "total_spend": summary.total_spend if summary else 0,
                "vote_count": vote_count,
            }
        )
    return results


def get_votes(session_id: str) -> dict[str, int]:
    return _votes.get(session_id, {"conservative": 0, "aggressive": 0, "balanced": 0})


def build_preference_context(session_id: str) -> str:
    """Build a natural-language preference summary from voted recommendations.

    Returns an empty string if no votes have been cast yet.
    """
    voted = _voted_recommendations.get(session_id, [])
    if not voted:
        return ""

    lines = [
        "The user has previously upvoted the following recommendations, "
        "indicating areas they want you to focus on:"
    ]
    for v in voted:
        lines.append(f"- {v['title']}: {v['description']}")

    lines.append("")
    lines.append(
        "Prioritize analysis in these areas. Suggest deeper, more specific "
        "strategies related to these topics. Do NOT change your risk tolerance "
        "or personality — keep your unique perspective, but focus your attention "
        "on the areas the user cares about most."
    )

    return "\n".join(lines)
