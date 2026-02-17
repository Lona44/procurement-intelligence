"""Pre-built DataSummary for the demo route.

Realistic procurement data so hiring managers can experience the full
arena flow without uploading a CSV.
"""

from app.models.schemas import (
    CategorySummary,
    DataSummary,
    DepartmentSummary,
    MonthlyTrend,
    VendorSummary,
)

DEMO_SUMMARY = DataSummary(
    total_spend=1_284_750.00,
    row_count=2_847,
    unique_vendor_count=42,
    date_range="2024-01-01 to 2024-12-31",
    date_min="2024-01-01",
    date_max="2024-12-31",
    top_vendors=[
        VendorSummary(vendor="Amazon Web Services", total_spend=189_400.00, transaction_count=312),
        VendorSummary(vendor="Microsoft Azure", total_spend=142_300.00, transaction_count=198),
        VendorSummary(vendor="Deloitte Consulting", total_spend=125_000.00, transaction_count=24),
        VendorSummary(vendor="Salesforce", total_spend=98_500.00, transaction_count=48),
        VendorSummary(vendor="Google Cloud Platform", total_spend=87_200.00, transaction_count=156),
        VendorSummary(vendor="Staples", total_spend=62_800.00, transaction_count=423),
        VendorSummary(vendor="Office Depot", total_spend=54_300.00, transaction_count=387),
        VendorSummary(vendor="McKinsey & Company", total_spend=48_000.00, transaction_count=12),
        VendorSummary(
            vendor="Zoom Video Communications", total_spend=36_200.00, transaction_count=96
        ),
        VendorSummary(vendor="Slack Technologies", total_spend=28_400.00, transaction_count=84),
    ],
    category_breakdown=[
        CategorySummary(
            category="Cloud Infrastructure", total_spend=418_900.00, transaction_count=666
        ),
        CategorySummary(
            category="Professional Services", total_spend=198_000.00, transaction_count=48
        ),
        CategorySummary(
            category="Software Licenses", total_spend=285_600.00, transaction_count=384
        ),
        CategorySummary(category="Office Supplies", total_spend=142_100.00, transaction_count=891),
        CategorySummary(
            category="Travel & Entertainment", total_spend=240_150.00, transaction_count=858
        ),
    ],
    department_breakdown=[
        DepartmentSummary(department="Engineering", total_spend=486_200.00, transaction_count=834),
        DepartmentSummary(department="Operations", total_spend=312_400.00, transaction_count=756),
        DepartmentSummary(department="Marketing", total_spend=268_150.00, transaction_count=642),
        DepartmentSummary(department="Finance", total_spend=218_000.00, transaction_count=615),
    ],
    monthly_trends=[
        MonthlyTrend(month="2024-01", total_spend=94_200.00),
        MonthlyTrend(month="2024-02", total_spend=98_100.00),
        MonthlyTrend(month="2024-03", total_spend=102_500.00),
        MonthlyTrend(month="2024-04", total_spend=99_800.00),
        MonthlyTrend(month="2024-05", total_spend=105_300.00),
        MonthlyTrend(month="2024-06", total_spend=108_900.00),
        MonthlyTrend(month="2024-07", total_spend=112_400.00),
        MonthlyTrend(month="2024-08", total_spend=106_700.00),
        MonthlyTrend(month="2024-09", total_spend=110_200.00),
        MonthlyTrend(month="2024-10", total_spend=115_800.00),
        MonthlyTrend(month="2024-11", total_spend=118_350.00),
        MonthlyTrend(month="2024-12", total_spend=112_500.00),
    ],
    duplicate_vendors=[
        "Staples / Staples Express",
        "Office Depot / Office Depot Online",
        "Zoom Video Communications / Zoom",
        "Slack Technologies / Slack",
    ],
)
