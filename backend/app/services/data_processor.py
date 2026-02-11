"""Process uploaded CSV/XLSX data with Pandas to produce summaries for agents."""

import re
from difflib import SequenceMatcher
from io import BytesIO, StringIO

import pandas as pd

from app.config import (
    DUPLICATE_VENDOR_CAP,
    DUPLICATE_VENDOR_THRESHOLD,
    MAX_COLUMNS,
    MAX_ROWS,
    TOP_VENDORS_LIMIT,
)
from app.models.schemas import ColumnStats, DataSummary, SuggestedMapping

# Characters that trigger formula execution in spreadsheet applications
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r", "\n")

# Keyword hints per target field (lowercase)
_FIELD_KEYWORDS: dict[str, list[str]] = {
    "date": [
        "date",
        "publish",
        "created",
        "signed",
        "start_date",
        "contract_date",
        "period",
        "invoice_date",
        "effective",
        "timestamp",
    ],
    "vendor": [
        "vendor",
        "supplier",
        "provider",
        "company",
        "contractor",
        "seller",
        "merchant",
        "payee",
        "partner",
    ],
    "category": [
        "category",
        "unspsc",
        "classification",
        "type",
        "class",
        "sector",
        "segment",
        "product",
        "service",
    ],
    "amount": [
        "amount",
        "value",
        "cost",
        "spend",
        "price",
        "total",
        "sum",
        "payment",
        "fee",
        "budget",
        "contract_value",
    ],
    "department": [
        "department",
        "agency",
        "division",
        "org",
        "business_unit",
        "unit",
        "team",
        "branch",
        "office",
        "entity",
    ],
}


# Common business suffixes to strip before comparing vendor names
_BUSINESS_SUFFIXES = re.compile(
    r"\b(pty|ltd|limited|p/l|p-l|inc|incorporated|corp|corporation|"
    r"llc|llp|plc|gmbh|australia|aust|nsw|vic|qld|act|sa|wa|nt|tas)\b",
    re.IGNORECASE,
)


def _normalize_vendor(name: str) -> str:
    """Strip common suffixes and punctuation so comparison focuses on the real name."""
    name = name.lower().strip()
    name = _BUSINESS_SUFFIXES.sub("", name)
    name = re.sub(r"[^a-z0-9\s]", "", name)  # remove punctuation
    return " ".join(name.split())  # collapse whitespace


def find_duplicate_vendors(
    vendors: list[str], threshold: float = DUPLICATE_VENDOR_THRESHOLD
) -> list[str]:
    """Find vendor names that look like duplicates."""
    normalized = {v: _normalize_vendor(v) for v in vendors}
    duplicates = []
    seen = set()
    for i, v1 in enumerate(vendors):
        for v2 in vendors[i + 1 :]:
            pair = tuple(sorted([v1, v2]))
            if pair in seen:
                continue
            seen.add(pair)
            n1, n2 = normalized[v1], normalized[v2]
            if not n1 or not n2:
                continue
            ratio = SequenceMatcher(None, n1, n2).ratio()
            if ratio >= threshold and n1 != n2:
                duplicates.append(f"{v1} / {v2} (similarity: {ratio:.0%})")
    return duplicates


def parse_file(content: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or XLSX file into a DataFrame with normalized column names."""
    if filename.lower().endswith(".xlsx"):
        df = pd.read_excel(BytesIO(content), engine="openpyxl")
    else:
        df = pd.read_csv(StringIO(content.decode("utf-8")))

    if len(df) > MAX_ROWS:
        raise ValueError(f"File exceeds maximum of {MAX_ROWS:,} rows ({len(df):,} found)")
    if len(df.columns) > MAX_COLUMNS:
        raise ValueError(f"File exceeds maximum of {MAX_COLUMNS} columns ({len(df.columns)} found)")

    df.columns = [c.strip().lower() for c in df.columns]
    return df


def suggest_column_mappings(columns: list[str]) -> list[SuggestedMapping]:
    """Auto-suggest mappings from source columns to required target fields."""
    suggestions: list[SuggestedMapping] = []

    for target, keywords in _FIELD_KEYWORDS.items():
        best_col: str | None = None
        best_score = 0.0

        for col in columns:
            col_lower = col.strip().lower()
            score = 0.0

            for kw in keywords:
                if col_lower == kw:
                    score = max(score, 1.0)
                elif kw in col_lower or col_lower in kw:
                    score = max(score, 0.8)
                elif any(part in col_lower for part in kw.split("_")):
                    score = max(score, 0.6)

            if score > best_score:
                best_score = score
                best_col = col

        if best_col and best_score > 0:
            suggestions.append(
                SuggestedMapping(
                    source_column=best_col,
                    target_field=target,
                    confidence=best_score,
                )
            )

    return suggestions


_DTYPE_SAMPLE_SIZE = 1000


def _infer_dtype(series: pd.Series) -> str:
    """Infer a human-readable dtype for a column using a sample for speed."""
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    # Sample non-null values to avoid parsing huge columns
    non_null = series.dropna()
    if len(non_null) > 0:
        sample = non_null.head(_DTYPE_SAMPLE_SIZE)
        try:
            parsed = pd.to_datetime(sample, errors="coerce")
            if parsed.notna().sum() / len(sample) > 0.5:
                return "date"
        except Exception:  # noqa: S110
            pass
    return "string"


def compute_column_stats(df: pd.DataFrame) -> list[ColumnStats]:
    """Compute per-column data quality statistics."""
    stats: list[ColumnStats] = []

    for col in df.columns:
        series = df[col]
        total = len(series)
        missing = int(series.isna().sum())
        missing_pct = round((missing / total) * 100, 1) if total > 0 else 0.0
        non_null = series.dropna()
        unique = int(non_null.nunique())

        # Grab first 5 distinct values, sanitize formula-injection prefixes
        raw_samples = [str(v) for v in non_null.drop_duplicates().head(5)]
        sample_values = [f"'{v}" if v and v[0] in _FORMULA_PREFIXES else v for v in raw_samples]

        dtype = _infer_dtype(series)

        min_val: str | None = None
        max_val: str | None = None

        if dtype == "numeric" and len(non_null) > 0:
            min_val = str(series.min())
            max_val = str(series.max())
        elif dtype == "date" and len(non_null) > 0:
            parsed = pd.to_datetime(non_null, errors="coerce").dropna()
            if len(parsed) > 0:
                min_val = parsed.min().strftime("%Y-%m-%d")
                max_val = parsed.max().strftime("%Y-%m-%d")

        stats.append(
            ColumnStats(
                name=col,
                dtype=dtype,
                total_count=total,
                missing_count=missing,
                missing_pct=missing_pct,
                unique_count=unique,
                sample_values=sample_values,
                min_value=min_val,
                max_value=max_val,
            )
        )

    return stats


def summarize_dataframe(df: pd.DataFrame) -> DataSummary:
    """Compute DataSummary from an already-mapped DataFrame.

    Expects columns: date (datetime), vendor, category, amount (numeric),
    department, month (period string).
    """
    total_spend = float(df["amount"].sum())
    row_count = len(df)

    date_min = df["date"].min()
    date_max = df["date"].max()
    date_min_str = date_min.strftime("%Y-%m-%d") if pd.notna(date_min) else None
    date_max_str = date_max.strftime("%Y-%m-%d") if pd.notna(date_max) else None
    date_range = f"{date_min_str} to {date_max_str}" if date_min_str and date_max_str else "N/A"

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
    # Cap to prevent O(n^2) explosion with many vendors
    duplicate_vendors = find_duplicate_vendors(unique_vendors[:DUPLICATE_VENDOR_CAP])

    return DataSummary(
        total_spend=round(total_spend, 2),
        row_count=row_count,
        unique_vendor_count=len(unique_vendors),
        date_range=date_range,
        date_min=date_min_str,
        date_max=date_max_str,
        top_vendors=top_vendors,
        category_breakdown=category_breakdown,
        department_breakdown=department_breakdown,
        monthly_trends=monthly_trends,
        duplicate_vendors=duplicate_vendors,
    )


def apply_mappings_and_summarize(
    df: pd.DataFrame, mappings: dict[str, str]
) -> tuple[pd.DataFrame, DataSummary]:
    """Rename columns per mappings, then compute DataSummary.

    mappings: { target_field: source_column }, e.g. {"date": "publish date", ...}
    """
    rename_map = {source: target for target, source in mappings.items()}
    df = df.rename(columns=rename_map)

    required = {"date", "vendor", "category", "amount", "department"}
    if not required.issubset(set(df.columns)):
        missing = required - set(df.columns)
        raise ValueError(f"After mapping, still missing columns: {missing}")

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    for col in ("vendor", "category", "department"):
        df[col] = df[col].astype(str).replace("nan", "Unknown")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["month"] = df["date"].dt.to_period("M").astype(str)

    summary = summarize_dataframe(df)
    return df, summary


def process_file(content: bytes, filename: str) -> tuple[pd.DataFrame, DataSummary]:
    """Legacy entry point — parse, auto-map, and summarize in one step."""
    df = parse_file(content, filename)

    # Build identity mappings for already-matching columns
    required = {"date", "vendor", "category", "amount", "department"}
    if not required.issubset(set(df.columns)):
        missing = required - set(df.columns)
        raise ValueError(f"CSV missing columns: {missing}")

    mappings = {col: col for col in required}
    return apply_mappings_and_summarize(df, mappings)
