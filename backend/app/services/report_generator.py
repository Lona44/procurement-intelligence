"""PDF report generation using fpdf2."""

from __future__ import annotations

import logging

from fpdf import FPDF

from app.models.schemas import AgentResult, DataSummary

logger = logging.getLogger("arena.report")

# ── Colours ──────────────────────────────────────────────────────────
_DARK = (30, 30, 30)
_MUTED = (100, 100, 100)
_WHITE = (255, 255, 255)
_HEADER_BG = (37, 99, 235)  # blue-600
_ROW_ALT = (248, 250, 252)  # slate-50
_VOTED_BG = (236, 253, 245)  # emerald-50
_AGENT_COLORS: dict[str, tuple[int, int, int]] = {
    "conservative": (20, 184, 166),  # teal-500
    "aggressive": (249, 115, 22),  # orange-500
    "balanced": (99, 102, 241),  # indigo-500
}
_RISK_COLORS: dict[str, tuple[int, int, int]] = {
    "low": (22, 163, 74),
    "medium": (202, 138, 4),
    "high": (220, 38, 38),
}


def _fmt_currency(value: float) -> str:
    return f"${value:,.0f}"


def _safe(text: str) -> str:
    """Strip characters that fpdf2 cannot encode in latin-1."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


class ReportPDF(FPDF):
    """Custom FPDF subclass with header/footer branding."""

    report_title: str = "Procurement Analysis Report"

    def header(self) -> None:
        if self.page_no() == 1:
            return  # cover page has its own header
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*_MUTED)
        self.cell(0, 8, _safe(self.report_title), align="L")
        self.ln(12)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*_MUTED)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


# ── Section helpers ──────────────────────────────────────────────────


def _section_title(pdf: ReportPDF, title: str) -> None:
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*_DARK)
    pdf.cell(0, 10, _safe(title))
    pdf.ln(6)
    # thin accent line
    pdf.set_draw_color(*_HEADER_BG)
    pdf.set_line_width(0.6)
    pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 45, pdf.get_y())
    pdf.ln(8)


def _kpi_box(pdf: ReportPDF, label: str, value: str, x: float, y: float, w: float) -> None:
    pdf.set_xy(x, y)
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(x, y, w, 22, style="F")
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*_MUTED)
    pdf.set_xy(x + 3, y + 2)
    pdf.cell(w - 6, 5, _safe(label))
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*_DARK)
    pdf.set_xy(x + 3, y + 10)
    pdf.cell(w - 6, 8, _safe(value))


def _table_header(pdf: ReportPDF, cols: list[tuple[str, float]]) -> None:
    pdf.set_fill_color(*_HEADER_BG)
    pdf.set_text_color(*_WHITE)
    pdf.set_font("Helvetica", "B", 9)
    for label, w in cols:
        pdf.cell(w, 8, _safe(label), border=0, fill=True)
    pdf.ln()
    pdf.set_text_color(*_DARK)


def _table_row(
    pdf: ReportPDF,
    cols: list[tuple[str, float]],
    row_idx: int,
    highlight: bool = False,
) -> None:
    if highlight:
        pdf.set_fill_color(*_VOTED_BG)
    elif row_idx % 2 == 1:
        pdf.set_fill_color(*_ROW_ALT)
    else:
        pdf.set_fill_color(*_WHITE)

    pdf.set_font("Helvetica", "", 9)
    for text, w in cols:
        pdf.cell(w, 7, _safe(text), border=0, fill=True)
    pdf.ln()


# ── Cover page ───────────────────────────────────────────────────────


def _render_cover(
    pdf: ReportPDF,
    filename: str,
    created_at: str,
    summary: DataSummary,
    primary_rec: str,
) -> None:
    pdf.add_page()

    # Blue banner
    pdf.set_fill_color(*_HEADER_BG)
    pdf.rect(0, 0, 210, 90, style="F")

    pdf.set_y(22)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*_WHITE)
    pdf.cell(0, 12, "Procurement Analysis Report", align="C")
    pdf.ln(14)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, _safe(f"Source: {filename}"), align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, _safe(f"Generated: {created_at[:10]}"), align="C")

    # KPI boxes — 2×2 grid for breathing room
    y_kpi = 100
    margin = 15.0
    usable = 210 - 2 * margin
    gap = 6.0
    box_w = (usable - gap) / 2
    row_h = 28.0

    _kpi_box(pdf, "Total Spend", _fmt_currency(summary.total_spend), margin, y_kpi, box_w)
    _kpi_box(pdf, "Transactions", str(summary.row_count), margin + box_w + gap, y_kpi, box_w)
    _kpi_box(pdf, "Date Range", summary.date_range, margin, y_kpi + row_h, box_w)
    _kpi_box(
        pdf,
        "Unique Vendors",
        str(summary.unique_vendor_count),
        margin + box_w + gap,
        y_kpi + row_h,
        box_w,
    )

    # Primary recommendation callout
    callout_y = y_kpi + 2 * row_h + 8
    if primary_rec:
        pdf.set_xy(margin, callout_y)
        pdf.set_fill_color(236, 253, 245)
        pdf.set_draw_color(22, 163, 74)
        pdf.rect(margin, callout_y, usable + 6, 20, style="FD")
        pdf.set_xy(margin + 4, callout_y + 2)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*_DARK)
        pdf.cell(0, 6, "Top Recommendation")
        pdf.set_xy(margin + 4, callout_y + 10)
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(usable - 4, 5, _safe(primary_rec))

    # Top vendors mini-table to fill remaining cover space
    if summary.top_vendors:
        table_y = callout_y + 30
        pdf.set_xy(margin, table_y)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*_DARK)
        pdf.cell(0, 7, "Top Vendors by Spend")
        pdf.ln(8)

        vendor_cols: list[tuple[str, float]] = [
            ("Vendor", 80),
            ("Spend", 50),
            ("Transactions", 50),
        ]
        _table_header(pdf, vendor_cols)
        for i, v in enumerate(summary.top_vendors[:5]):
            _table_row(
                pdf,
                [
                    (v.vendor[:45], 80),
                    (_fmt_currency(v.total_spend), 50),
                    (str(v.transaction_count), 50),
                ],
                i,
            )


# ── Executive summary ────────────────────────────────────────────────


def _render_executive_summary(pdf: ReportPDF, agents: list[AgentResult]) -> None:
    pdf.add_page()
    _section_title(pdf, "Executive Summary")

    cols: list[tuple[str, float]] = [
        ("Agent", 32),
        ("Total Savings", 32),
        ("Recs", 18),
        ("Confidence", 28),
        ("Top Recommendation", 80),
    ]
    _table_header(pdf, cols)

    for i, agent in enumerate(agents):
        avg_conf = 0.0
        if agent.recommendations:
            avg_conf = sum(r.confidence for r in agent.recommendations) / len(agent.recommendations)
        top_rec = agent.recommendations[0].title if agent.recommendations else "-"
        _table_row(
            pdf,
            [
                (agent.agent_type.title(), 32),
                (_fmt_currency(agent.total_savings), 32),
                (str(len(agent.recommendations)), 18),
                (f"{avg_conf:.0%}", 28),
                (top_rec[:50], 80),
            ],
            i,
        )

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_MUTED)
    for agent in agents:
        pdf.multi_cell(0, 5, _safe(f"{agent.agent_type.title()}: {agent.summary}"))
        pdf.ln(3)


# ── Per-agent analysis ───────────────────────────────────────────────


def _render_agent_section(
    pdf: ReportPDF,
    agent: AgentResult,
    voted_ids: set[str],
) -> None:
    pdf.add_page()
    color = _AGENT_COLORS.get(agent.agent_type, _DARK)

    # Agent header
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*color)
    pdf.cell(0, 10, _safe(f"{agent.agent_type.title()} Agent"))
    pdf.ln(8)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_MUTED)
    pdf.multi_cell(0, 5, _safe(agent.summary))
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*_DARK)
    pdf.cell(0, 7, _safe(f"Total Projected Savings: {_fmt_currency(agent.total_savings)}"))
    pdf.ln(10)

    for idx, rec in enumerate(agent.recommendations):
        is_voted = rec.id in voted_ids

        # Check if we need a new page (leave room for at least 60mm of content)
        if pdf.get_y() > 230:
            pdf.add_page()

        # Recommendation card header
        risk_color = _RISK_COLORS.get(rec.risk_level, _MUTED)
        if is_voted:
            pdf.set_fill_color(*_VOTED_BG)
        else:
            pdf.set_fill_color(*_ROW_ALT)
        y_start = pdf.get_y()
        pdf.rect(15, y_start, 180, 8, style="F")

        pdf.set_xy(17, y_start + 1)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*_DARK)
        voted_marker = " [VOTED]" if is_voted else ""
        pdf.cell(100, 6, _safe(f"{idx + 1}. {rec.title}{voted_marker}"))

        # Risk badge
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*risk_color)
        pdf.cell(25, 6, _safe(rec.risk_level.upper()), align="C")

        # Savings + confidence
        pdf.set_text_color(*_DARK)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, _safe(f"{_fmt_currency(rec.estimated_savings)}  |  {rec.confidence:.0%}"))
        pdf.ln(10)

        # Description
        pdf.set_x(17)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_MUTED)
        pdf.multi_cell(176, 4.5, _safe(rec.description))
        pdf.ln(2)

        # Pros / Cons side by side
        if rec.pros or rec.cons:
            x_left = 17.0
            x_right = 105.0
            y_pc = pdf.get_y()

            if rec.pros:
                pdf.set_xy(x_left, y_pc)
                pdf.set_font("Helvetica", "B", 8)
                pdf.set_text_color(22, 163, 74)
                pdf.cell(40, 5, "Pros")
                pdf.ln(5)
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(*_MUTED)
                for pro in rec.pros:
                    pdf.set_x(x_left + 2)
                    pdf.multi_cell(82, 4, _safe(f"+ {pro}"))
            y_after_pros = pdf.get_y()

            if rec.cons:
                pdf.set_xy(x_right, y_pc)
                pdf.set_font("Helvetica", "B", 8)
                pdf.set_text_color(220, 38, 38)
                pdf.cell(40, 5, "Cons")
                pdf.set_xy(x_right, y_pc + 5)
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(*_MUTED)
                for con in rec.cons:
                    pdf.set_x(x_right + 2)
                    pdf.multi_cell(82, 4, _safe(f"- {con}"))
            y_after_cons = pdf.get_y()

            pdf.set_y(max(y_after_pros, y_after_cons) + 4)
        else:
            pdf.ln(4)


# ── Methodology & Proof ─────────────────────────────────────────────


def _build_verification_formulas(
    summary: DataSummary,
    column_mappings: dict[str, str],
) -> list[tuple[str, str, str]]:
    """Return (metric, expected_value, excel_formula) tuples."""
    amount_col = column_mappings.get("amount", "amount")
    vendor_col = column_mappings.get("vendor", "vendor")
    date_col = column_mappings.get("date", "date")

    formulas: list[tuple[str, str, str]] = [
        (
            "Total Spend",
            _fmt_currency(summary.total_spend),
            f"=SUM({amount_col}2:{amount_col}N)",
        ),
        (
            "Transaction Count",
            str(summary.row_count),
            f"=COUNTA({amount_col}2:{amount_col}N)",
        ),
        (
            "Unique Vendors",
            str(summary.unique_vendor_count),
            f"=SUMPRODUCT(1/COUNTIF({vendor_col}2:{vendor_col}N,{vendor_col}2:{vendor_col}N))",
        ),
        (
            "Date Range Start",
            summary.date_min or "-",
            f"=MIN({date_col}2:{date_col}N)",
        ),
        (
            "Date Range End",
            summary.date_max or "-",
            f"=MAX({date_col}2:{date_col}N)",
        ),
    ]

    # Top vendor spend formulas
    for v in summary.top_vendors[:3]:
        formulas.append(
            (
                f"Spend: {v.vendor}",
                _fmt_currency(v.total_spend),
                f'=SUMIFS({amount_col}:{amount_col},{vendor_col}:{vendor_col},"{v.vendor}")',
            )
        )
        formulas.append(
            (
                f"Count: {v.vendor}",
                str(v.transaction_count),
                f'=COUNTIF({vendor_col}:{vendor_col},"{v.vendor}")',
            )
        )

    return formulas


def _render_methodology(
    pdf: ReportPDF,
    column_mappings: dict[str, str],
    raw_columns: list[str],
    summary: DataSummary,
) -> None:
    pdf.add_page()
    _section_title(pdf, "Methodology & Proof")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_MUTED)
    pdf.multi_cell(
        0,
        5,
        _safe(
            "This section documents how the original spreadsheet columns were mapped "
            "to standard fields, and provides Excel formulas you can use to independently "
            "verify the summary statistics shown in this report."
        ),
    )
    pdf.ln(6)

    # Column mappings table
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*_DARK)
    pdf.cell(0, 7, "Column Mappings")
    pdf.ln(8)

    mapping_cols: list[tuple[str, float]] = [
        ("Standard Field", 50),
        ("Original Column", 70),
    ]
    _table_header(pdf, mapping_cols)
    for i, (field, source) in enumerate(sorted(column_mappings.items())):
        _table_row(pdf, [(field, 50), (source, 70)], i)

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*_MUTED)
    all_cols = ", ".join(raw_columns) if raw_columns else "-"
    pdf.multi_cell(0, 4, _safe(f"All original columns: {all_cols}"))
    pdf.ln(8)

    # Verification formulas table
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*_DARK)
    pdf.cell(0, 7, "Verification Formulas")
    pdf.ln(8)

    formulas = _build_verification_formulas(summary, column_mappings)
    col_metric_w = 45.0
    col_value_w = 35.0
    col_formula_w = 100.0
    total_w = col_metric_w + col_value_w + col_formula_w
    line_h = 3.8

    formula_cols: list[tuple[str, float]] = [
        ("Metric", col_metric_w),
        ("Expected Value", col_value_w),
        ("Excel Formula", col_formula_w),
    ]
    _table_header(pdf, formula_cols)

    for i, (metric, value, formula) in enumerate(formulas):
        if pdf.get_y() > 245:
            pdf.add_page()

        pdf.set_font("Helvetica", "", 7)

        # Measure heights for all three columns via dry_run
        metric_lines = pdf.multi_cell(
            col_metric_w - 2, line_h, _safe(metric), dry_run=True, output="LINES"
        )
        value_lines = pdf.multi_cell(
            col_value_w - 2, line_h, _safe(value), dry_run=True, output="LINES"
        )
        formula_lines = pdf.multi_cell(
            col_formula_w - 2, line_h, _safe(formula), dry_run=True, output="LINES"
        )
        row_h = max(len(metric_lines), len(value_lines), len(formula_lines)) * line_h
        row_h = max(row_h, 6.0)

        # Row background
        if i % 2 == 1:
            pdf.set_fill_color(*_ROW_ALT)
        else:
            pdf.set_fill_color(*_WHITE)

        x_start = pdf.get_x()
        y_start = pdf.get_y()
        pdf.rect(x_start, y_start, total_w, row_h, "F")

        # Metric cell
        pdf.set_xy(x_start + 1, y_start)
        pdf.set_text_color(*_DARK)
        pdf.multi_cell(col_metric_w - 2, line_h, _safe(metric))

        # Value cell
        pdf.set_xy(x_start + col_metric_w + 1, y_start)
        pdf.multi_cell(col_value_w - 2, line_h, _safe(value))

        # Formula cell
        pdf.set_xy(x_start + col_metric_w + col_value_w + 1, y_start)
        pdf.set_text_color(*_MUTED)
        pdf.multi_cell(col_formula_w - 2, line_h, _safe(formula))

        pdf.set_y(y_start + row_h)


# ── Public API ───────────────────────────────────────────────────────


def generate_report(
    filename: str,
    created_at: str,
    summary: DataSummary,
    column_mappings: dict[str, str],
    raw_columns: list[str],
    agents: list[AgentResult],
    voted_ids: list[str],
) -> bytes:
    """Generate a full PDF report and return it as bytes."""
    pdf = ReportPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.report_title = f"Procurement Report - {filename}"

    voted_set = set(voted_ids)

    # Find primary recommendation (highest savings across all agents)
    primary_rec = ""
    best_savings = 0.0
    for agent in agents:
        for rec in agent.recommendations:
            if rec.estimated_savings > best_savings:
                best_savings = rec.estimated_savings
                primary_rec = f"{rec.title} ({_fmt_currency(rec.estimated_savings)} savings)"

    _render_cover(pdf, filename, created_at, summary, primary_rec)
    _render_executive_summary(pdf, agents)

    for agent in agents:
        _render_agent_section(pdf, agent, voted_set)

    _render_methodology(pdf, column_mappings, raw_columns, summary)

    return bytes(pdf.output())
