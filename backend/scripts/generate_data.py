"""Generate synthetic procurement spend data with embedded patterns for agents to discover."""
import csv
import random
import os
from datetime import datetime, timedelta

random.seed(42)

VENDORS = {
    "Office Supplies": [
        "Staples", "Office Depot", "OfficeMax", "Staples Express", "Office Depot Online"
    ],
    "Cloud Services": [
        "AWS", "Microsoft Azure", "Google Cloud", "DigitalOcean"
    ],
    "Software Licenses": [
        "Salesforce", "HubSpot", "Slack", "Zoom", "Microsoft 365",
        "Zoom Video", "Slack Technologies"
    ],
    "Consulting": [
        "Deloitte", "McKinsey", "Accenture", "PwC"
    ],
    "Travel": [
        "United Airlines", "Delta Airlines", "Marriott", "Hilton", "Enterprise Rent-A-Car"
    ],
    "Marketing": [
        "Google Ads", "Facebook Ads", "HubSpot Marketing", "Mailchimp"
    ],
    "Facilities": [
        "CBRE", "JLL", "Cushman & Wakefield", "ABM Industries"
    ],
}

DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Finance", "HR", "Operations"]

AMOUNT_RANGES = {
    "Office Supplies": (50, 2000),
    "Cloud Services": (500, 15000),
    "Software Licenses": (200, 8000),
    "Consulting": (5000, 50000),
    "Travel": (200, 5000),
    "Marketing": (1000, 20000),
    "Facilities": (2000, 15000),
}


def generate_data(output_path: str, num_rows: int = 300):
    rows = []
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 12, 31)
    date_range_days = (end_date - start_date).days

    for _ in range(num_rows):
        category = random.choice(list(VENDORS.keys()))
        vendor = random.choice(VENDORS[category])
        department = random.choice(DEPARTMENTS)
        day_offset = random.randint(0, date_range_days)
        date = start_date + timedelta(days=day_offset)
        lo, hi = AMOUNT_RANGES[category]
        amount = round(random.uniform(lo, hi), 2)

        # Pattern: cloud price creep - later months cost more
        if category == "Cloud Services":
            month_factor = 1 + (date.month - 1) * 0.05
            amount = round(amount * month_factor, 2)

        # Pattern: duplicate software licenses in different departments
        if vendor in ("Zoom", "Zoom Video") and department in ("Engineering", "Sales"):
            amount = round(random.uniform(1500, 3000), 2)
        if vendor in ("Slack", "Slack Technologies") and department in ("Engineering", "Marketing"):
            amount = round(random.uniform(1000, 2500), 2)

        rows.append({
            "Date": date.strftime("%Y-%m-%d"),
            "Vendor": vendor,
            "Category": category,
            "Amount": amount,
            "Department": department,
        })

    # Sort by date
    rows.sort(key=lambda r: r["Date"])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["Date", "Vendor", "Category", "Amount", "Department"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} rows -> {output_path}")


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output = os.path.join(script_dir, "..", "data", "synthetic_spend.csv")
    generate_data(output)
