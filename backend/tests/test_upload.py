"""Upload and confirm-mappings endpoint tests."""

import pytest
from httpx import AsyncClient

from app.models.schemas import DataSummary, UploadResponse

from .conftest import sample_csv_bytes


class TestUploadEndpoint:
    """POST /api/upload tests."""

    @pytest.mark.asyncio
    async def test_upload_csv_returns_valid_schema(self, client: AsyncClient):
        """Upload CSV returns valid UploadResponse schema."""
        content = sample_csv_bytes()
        resp = await client.post(
            "/api/upload",
            files={"file": ("test.csv", content, "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        parsed = UploadResponse(**data)
        assert parsed.row_count == 10
        assert len(parsed.columns) == 5
        assert parsed.filename == "test.csv"

    @pytest.mark.asyncio
    async def test_rejects_non_csv_xlsx(self, client: AsyncClient):
        """Non-CSV/XLSX files are rejected with 400."""
        resp = await client.post(
            "/api/upload",
            files={"file": ("test.json", b'{"key": "value"}', "application/json")},
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_rejects_oversized_files(self, client: AsyncClient):
        """Files exceeding size limit are rejected with 413."""
        from unittest.mock import patch

        # Patch to 100 bytes max for test
        with patch("app.routers.upload.MAX_UPLOAD_SIZE_BYTES", 100):
            big_content = b"date,vendor,category,amount,department\n" + b"x" * 200
            resp = await client.post(
                "/api/upload",
                files={"file": ("big.csv", big_content, "text/csv")},
            )
            assert resp.status_code == 413

    @pytest.mark.asyncio
    async def test_column_suggestions_for_nonstandard_names(self, client: AsyncClient):
        """Non-standard column names get reasonable suggestions."""
        csv = b"invoice_date,supplier,classification,total_cost,division\n2024-01-01,Acme,IT,100,Eng\n"
        resp = await client.post(
            "/api/upload",
            files={"file": ("custom.csv", csv, "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Should have suggestions for most target fields
        assert len(data["suggested_mappings"]) >= 3

    @pytest.mark.asyncio
    async def test_filename_sanitization_strips_path_traversal(self, client: AsyncClient):
        """Filenames with path traversal are sanitized."""
        content = sample_csv_bytes()
        resp = await client.post(
            "/api/upload",
            files={"file": ("../../etc/passwd.csv", content, "text/csv")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "/" not in data["filename"]
        assert ".." not in data["filename"]


class TestConfirmMappings:
    """POST /api/confirm-mappings tests."""

    @pytest.mark.asyncio
    async def test_confirm_returns_valid_data_summary(self, client: AsyncClient):
        """Confirm mappings returns valid DataSummary."""
        content = sample_csv_bytes()
        upload_resp = await client.post(
            "/api/upload",
            files={"file": ("test.csv", content, "text/csv")},
        )
        session_id = upload_resp.json()["session_id"]

        resp = await client.post(
            "/api/confirm-mappings",
            json={
                "session_id": session_id,
                "mappings": {
                    "date": "date",
                    "vendor": "vendor",
                    "category": "category",
                    "amount": "amount",
                    "department": "department",
                },
            },
        )
        assert resp.status_code == 200
        summary = DataSummary(**resp.json())
        assert summary.total_spend > 0
        assert summary.row_count == 10

    @pytest.mark.asyncio
    async def test_confirm_rejects_missing_required_fields(self, client: AsyncClient):
        """Confirm mappings with missing fields returns 400."""
        content = sample_csv_bytes()
        upload_resp = await client.post(
            "/api/upload",
            files={"file": ("test.csv", content, "text/csv")},
        )
        session_id = upload_resp.json()["session_id"]

        resp = await client.post(
            "/api/confirm-mappings",
            json={
                "session_id": session_id,
                "mappings": {
                    "date": "date",
                    "vendor": "vendor",
                    # missing: category, amount, department
                },
            },
        )
        assert resp.status_code == 400
