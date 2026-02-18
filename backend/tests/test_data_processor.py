"""Data processor module tests — column mapping, summarization, and validation."""

import pandas as pd
import pytest

from app.config import MAX_ROWS
from app.services.data_processor import (
    apply_mappings_and_summarize,
    compute_column_stats,
    find_duplicate_vendors,
    parse_file,
    suggest_column_mappings,
    summarize_dataframe,
)


class TestParseFile:
    """Tests for file parsing and column normalization."""

    def test_column_name_normalization(self):
        """Column names should be lowercased and stripped."""
        csv = b"  Date , VENDOR , Category ,Amount,Department\n2024-01-01,Acme,IT,100,Eng\n"
        df = parse_file(csv, "test.csv")
        assert list(df.columns) == ["date", "vendor", "category", "amount", "department"]

    def test_row_limit_enforcement(self):
        """Raises ValueError when row count exceeds MAX_ROWS."""
        header = "date,vendor,category,amount,department\n"
        row = "2024-01-01,Acme,IT,100,Eng\n"
        # Create CSV with MAX_ROWS + 1 rows
        csv = (header + row * (MAX_ROWS + 1)).encode()
        with pytest.raises(ValueError, match="exceeds maximum"):
            parse_file(csv, "test.csv")


class TestSuggestColumnMappings:
    """Tests for column mapping suggestions."""

    def test_exact_match_column_mapping(self):
        """Exact column name match gives confidence 1.0."""
        columns = ["date", "vendor", "category", "amount", "department"]
        suggestions = suggest_column_mappings(columns)

        for s in suggestions:
            assert s.confidence == 1.0, f"{s.source_column} → {s.target_field} should be 1.0"

    def test_partial_match_column_mapping(self):
        """Partial match like invoice_date → date gives confidence 0.8."""
        columns = ["invoice_date", "supplier", "classification", "total_spend", "agency"]
        suggestions = suggest_column_mappings(columns)

        target_map = {s.target_field: s for s in suggestions}
        assert "date" in target_map
        assert target_map["date"].source_column == "invoice_date"
        assert target_map["date"].confidence >= 0.6


class TestInferDtype:
    """Tests for dtype inference via compute_column_stats."""

    def test_dtype_inference(self):
        """Numeric, date, and string columns detected correctly."""
        df = pd.DataFrame(
            {
                "price": [100.0, 200.5, 300.0],
                "created": ["2024-01-01", "2024-02-01", "2024-03-01"],
                "name": ["Alice", "Bob", "Charlie"],
            }
        )
        stats = compute_column_stats(df)
        stat_map = {s.name: s for s in stats}

        assert stat_map["price"].dtype == "numeric"
        assert stat_map["created"].dtype == "date"
        assert stat_map["name"].dtype == "string"


class TestSummarizeDataframe:
    """Tests for DataFrame summarization."""

    def test_aggregations_match_hand_calculated(self):
        """Summarize aggregations should match manual calculations."""
        df = pd.DataFrame(
            {
                "date": pd.to_datetime(["2024-01-15", "2024-01-20", "2024-02-10"]),
                "vendor": ["Acme", "Globex", "Acme"],
                "category": ["IT", "Marketing", "IT"],
                "amount": [1000.0, 2000.0, 1500.0],
                "department": ["Eng", "Mkt", "Eng"],
                "month": ["2024-01", "2024-01", "2024-02"],
            }
        )

        summary = summarize_dataframe(df)

        assert summary.total_spend == 4500.0
        assert summary.row_count == 3
        assert summary.unique_vendor_count == 2
        assert summary.date_range == "2024-01-15 to 2024-02-10"

        # Top vendors: Acme=2500, Globex=2000
        vendor_spends = {v.vendor: v.total_spend for v in summary.top_vendors}
        assert vendor_spends["Acme"] == 2500.0
        assert vendor_spends["Globex"] == 2000.0


class TestDuplicateVendors:
    """Tests for duplicate vendor detection."""

    def test_finds_similar_vendors(self):
        """Should detect near-duplicate vendor names."""
        # Use names that are similar after normalization but not identical
        vendors = ["Office Depot", "Office Depot Online", "Amazon", "Google"]
        duplicates = find_duplicate_vendors(vendors, threshold=0.7)
        assert len(duplicates) >= 1
        assert any("Office Depot" in d for d in duplicates)


class TestApplyMappingsAndSummarize:
    """Tests for the full mapping + summarization pipeline."""

    def test_renames_correctly(self):
        """Columns should be renamed per mapping before summarization."""
        df = pd.DataFrame(
            {
                "invoice_date": ["2024-01-01", "2024-02-01"],
                "supplier": ["Acme", "Globex"],
                "type": ["IT", "Marketing"],
                "cost": [1000.0, 2000.0],
                "division": ["Eng", "Mkt"],
            }
        )

        mappings = {
            "date": "invoice_date",
            "vendor": "supplier",
            "category": "type",
            "amount": "cost",
            "department": "division",
        }

        result_df, summary = apply_mappings_and_summarize(df, mappings)

        assert "date" in result_df.columns
        assert "vendor" in result_df.columns
        assert summary.total_spend == 3000.0
        assert summary.row_count == 2
