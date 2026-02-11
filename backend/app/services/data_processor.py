"""Process uploaded CSV/XLSX data with Pandas to produce summaries for agents."""
import pandas as pd
from io import StringIO, BytesIO
from difflib import SequenceMatcher

from app.config import DUPLICATE_VENDOR_THRESHOLD, TOP_VENDORS_LIMIT
from app.models.schemas import DataSummary


def find_duplicate_vendors(vendors: list[str], threshold: float = DUPLICATE_VENDOR_THRESHOLD) -> list[str]:
    """Find vendor names that look like duplicates."""
    duplicates = []
    seen = set()
    for i, v1 in enumerate(vendors):
        for v2 in vendors[i + 1:]:
            pair = tuple(sorted([v1, v2]))
            if pair in seen:
                continue
            seen.add(pair)
            ratio = SequenceMatcher(None, v1.lower(), v2.lower()).ratio()
            if ratio >= threshold and v1 != v2:
                duplicates.append(f"{v1} / {v2} (similarity: {ratio:.0%})")
    return duplicates


def process_file(content: bytes, filename: str) -> tuple[pd.DataFrame, DataSummary]:
    """Parse CSV or XLSX file and compute summary statistics."""
    if filename.lower().endswith(".xlsx"):
        df = pd.read_excel(BytesIO(content), engine="openpyxl")
    else:
        df = pd.read_csv(StringIO(content.decode("utf-8")))

    # Normalize column names
    df.columns = [c.strip().lower() for c in df.columns]

    required = {"date", "vendor", "category", "amount", "department"}
    if not required.issubset(set(df.columns)):
        missing = required - set(df.columns)
        raise ValueError(f"CSV missing columns: {missing}")

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["month"] = df["date"].dt.to_period("M").astype(str)

    total_spend = float(df["amount"].sum())
    row_count = len(df)

    date_min = df["date"].min()
    date_max = df["date"].max()
    date_range = f"{date_min.strftime('%Y-%m-%d')} to {date_max.strftime('%Y-%m-%d')}" if pd.notna(date_min) else "N/A"

    top_vendors = (
        df.groupby("vendor")["amount"]
        .agg(["sum", "count"])
        .sort_values("sum", ascending=False)
        .head(TOP_VENDORS_LIMIT)
        .reset_index()
        .rename(columns={"sum": "total_spend", "count": "transaction_count"})
        .to_dict("records")
    )

    category_breakdown = (
        df.groupby("category")["amount"]
        .agg(["sum", "count"])
        .sort_values("sum", ascending=False)
        .reset_index()
        .rename(columns={"sum": "total_spend", "count": "transaction_count"})
        .to_dict("records")
    )

    department_breakdown = (
        df.groupby("department")["amount"]
        .agg(["sum", "count"])
        .sort_values("sum", ascending=False)
        .reset_index()
        .rename(columns={"sum": "total_spend", "count": "transaction_count"})
        .to_dict("records")
    )

    monthly_trends = (
        df.groupby("month")["amount"]
        .sum()
        .sort_index()
        .reset_index()
        .rename(columns={"amount": "total_spend"})
        .to_dict("records")
    )

    unique_vendors = df["vendor"].unique().tolist()
    duplicate_vendors = find_duplicate_vendors(unique_vendors)

    summary = DataSummary(
        total_spend=round(total_spend, 2),
        row_count=row_count,
        date_range=date_range,
        top_vendors=top_vendors,
        category_breakdown=category_breakdown,
        department_breakdown=department_breakdown,
        monthly_trends=monthly_trends,
        duplicate_vendors=duplicate_vendors,
    )

    return df, summary
