"""Voting endpoints."""
from fastapi import APIRouter

from app.models.schemas import VoteRequest
from app.services.session_store import add_vote, get_votes

router = APIRouter()


@router.post("/api/vote")
async def cast_vote(req: VoteRequest):
    tallies = add_vote(
        req.session_id,
        req.agent_type,
        req.recommendation_id,
        req.recommendation_title,
        req.recommendation_description,
    )
    return {"votes": tallies}


@router.get("/api/votes/{session_id}")
async def get_vote_tallies(session_id: str):
    return {"votes": get_votes(session_id)}
