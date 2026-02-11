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


class VendorSummary(BaseModel):
    vendor: str
    total_spend: float
    transaction_count: int


class CategorySummary(BaseModel):
    category: str
    total_spend: float
    transaction_count: int


class DepartmentSummary(BaseModel):
    department: str
    total_spend: float
    transaction_count: int


class MonthlyTrend(BaseModel):
    month: str
    total_spend: float


class UploadResponse(BaseModel):
    session_id: str
    row_count: int
    total_spend: float
    date_range: str
    top_vendors: list[VendorSummary]
    categories: list[CategorySummary]


class DataSummary(BaseModel):
    total_spend: float
    row_count: int
    date_range: str
    top_vendors: list[VendorSummary]
    category_breakdown: list[CategorySummary]
    department_breakdown: list[DepartmentSummary]
    monthly_trends: list[MonthlyTrend]
    duplicate_vendors: list[str]
