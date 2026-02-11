from typing import Literal

from pydantic import BaseModel


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


class ReportRequest(BaseModel):
    agents: list[AgentResult]
    voted_recommendation_ids: list[str] = []


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


class ColumnStats(BaseModel):
    name: str
    dtype: str  # "string", "numeric", "date", "boolean"
    total_count: int
    missing_count: int
    missing_pct: float  # 0.0–100.0
    unique_count: int
    sample_values: list[str]
    min_value: str | None = None
    max_value: str | None = None


class SuggestedMapping(BaseModel):
    source_column: str
    target_field: str  # "date", "vendor", "category", "amount", "department"
    confidence: float  # 0.0–1.0


class UploadResponse(BaseModel):
    session_id: str
    filename: str
    row_count: int
    columns: list[str]
    suggested_mappings: list[SuggestedMapping]
    column_stats: list[ColumnStats]


class ConfirmMappingsRequest(BaseModel):
    session_id: str
    mappings: dict[str, str]  # { "date": "source_col", "vendor": "source_col", ... }


class DataSummary(BaseModel):
    total_spend: float
    row_count: int
    unique_vendor_count: int
    date_range: str
    date_min: str | None = None
    date_max: str | None = None
    top_vendors: list[VendorSummary]
    category_breakdown: list[CategorySummary]
    department_breakdown: list[DepartmentSummary]
    monthly_trends: list[MonthlyTrend]
    duplicate_vendors: list[str]
