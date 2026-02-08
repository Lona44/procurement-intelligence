from pydantic import BaseModel
from typing import Literal


class SpendRow(BaseModel):
    date: str
    vendor: str
    category: str
    amount: float
    department: str


class Recommendation(BaseModel):
    id: str
    title: str
    description: str
    estimated_savings: float
    confidence: float
    risk_level: Literal["low", "medium", "high"]
    pros: list[str]
    cons: list[str]


class AgentResult(BaseModel):
    agent_type: str
    recommendations: list[Recommendation]
    total_savings: float
    summary: str


class VoteRequest(BaseModel):
    session_id: str
    agent_type: str
    recommendation_id: str
    recommendation_title: str
    recommendation_description: str


class UploadResponse(BaseModel):
    session_id: str
    row_count: int
    total_spend: float
    date_range: str
    top_vendors: list[dict]
    categories: list[dict]


class DataSummary(BaseModel):
    total_spend: float
    row_count: int
    date_range: str
    top_vendors: list[dict]
    category_breakdown: list[dict]
    department_breakdown: list[dict]
    monthly_trends: list[dict]
    duplicate_vendors: list[str]
