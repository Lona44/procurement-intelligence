"""Pydantic schema validation tests."""

import pytest
from pydantic import ValidationError

from app.models.schemas import DataSummary, Recommendation, UploadResponse, VoteRequest


class TestRecommendation:
    """Recommendation model validation."""

    def test_rejects_invalid_risk_level(self):
        """risk_level must be one of low, medium, high."""
        with pytest.raises(ValidationError):
            Recommendation(
                id="r1",
                title="Test",
                description="Desc",
                estimated_savings=100,
                confidence=0.9,
                risk_level="extreme",  # type: ignore[arg-type]
                pros=["Pro"],
                cons=["Con"],
            )


class TestUploadResponse:
    """UploadResponse serialization."""

    def test_round_trip_serialization(self):
        """UploadResponse should serialize to dict and back."""
        resp = UploadResponse(
            session_id="abc123",
            filename="test.csv",
            row_count=100,
            columns=["date", "vendor", "amount"],
            suggested_mappings=[],
            column_stats=[],
        )

        data = resp.model_dump()
        restored = UploadResponse(**data)

        assert restored.session_id == "abc123"
        assert restored.filename == "test.csv"
        assert restored.row_count == 100
        assert restored.columns == ["date", "vendor", "amount"]


class TestDataSummary:
    """DataSummary field requirements."""

    def test_requires_all_fields(self):
        """DataSummary with missing required fields should raise."""
        with pytest.raises(ValidationError):
            DataSummary(
                total_spend=1000,
                # missing: row_count, unique_vendor_count, date_range, etc.
            )

    def test_valid_data_summary(self):
        """DataSummary with all fields should pass validation."""
        summary = DataSummary(
            total_spend=50000,
            row_count=200,
            unique_vendor_count=15,
            date_range="2024-01-01 to 2024-12-31",
            top_vendors=[],
            category_breakdown=[],
            department_breakdown=[],
            monthly_trends=[],
            duplicate_vendors=[],
        )
        assert summary.total_spend == 50000


class TestVoteRequest:
    """VoteRequest field requirements."""

    def test_requires_all_fields(self):
        """VoteRequest with missing required fields should raise."""
        with pytest.raises(ValidationError):
            VoteRequest(
                session_id="s1",
                agent_type="conservative",
                # missing: recommendation_id, recommendation_title, recommendation_description
            )
