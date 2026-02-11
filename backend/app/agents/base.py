"""Agent orchestration using LangGraph for parallel agent execution."""
import json
import asyncio
import logging
import operator
from typing import Annotated

from langgraph.graph import StateGraph, START, END
from openai import AsyncOpenAI
from typing_extensions import TypedDict

from app.config import (
    OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE,
    MOCK_AGENTS, THINKING_STEP_BASE_DELAY, THINKING_STEP_JITTER,
)
from app.agents.prompts import AGENT_PROMPTS
from app.models.schemas import AgentResult, DataSummary

logger = logging.getLogger("arena.agents")


# ---------------------------------------------------------------------------
# LangGraph state
# ---------------------------------------------------------------------------

class ArenaState(TypedDict):
    """Shared state flowing through the arena graph.

    `events` uses operator.add so parallel branches can independently
    append without clobbering each other.
    """
    summary: dict
    preferences: str
    events: Annotated[list[dict], operator.add]


# ---------------------------------------------------------------------------
# Thinking-step definitions
# ---------------------------------------------------------------------------

THINKING_STEPS: dict[str, list[str]] = {
    "conservative": [
        "Reviewing overall spend patterns...",
        "Identifying vendor consolidation opportunities...",
        "Analyzing contract renegotiation potential...",
        "Calculating conservative savings estimates...",
    ],
    "aggressive": [
        "Scanning for inefficiencies and waste...",
        "Evaluating vendor switching opportunities...",
        "Modeling aggressive renegotiation scenarios...",
        "Identifying automation and elimination targets...",
    ],
    "balanced": [
        "Analyzing spend distribution across categories...",
        "Weighing risk vs. reward for each opportunity...",
        "Identifying quick wins and strategic plays...",
        "Building balanced recommendation portfolio...",
    ],
}

# ---------------------------------------------------------------------------
# Mock results (used when MOCK_AGENTS=true or no API key)
# ---------------------------------------------------------------------------

MOCK_RESULTS: dict[str, AgentResult] = {
    "conservative": AgentResult(
        agent_type="conservative",
        recommendations=[
            {
                "id": "c1",
                "title": "Consolidate Office Supply Vendors",
                "description": "Merge purchases from Staples, Staples Express, Office Depot, and Office Depot Online into a single preferred vendor agreement. This reduces administrative overhead and qualifies for volume discounts.",
                "estimated_savings": 8500.00,
                "confidence": 0.92,
                "risk_level": "low",
                "pros": ["Minimal disruption", "Volume discounts", "Simplified procurement"],
                "cons": ["Vendor lock-in risk", "Requires contract negotiation"],
            },
            {
                "id": "c2",
                "title": "Renegotiate Cloud Service Contracts",
                "description": "Cloud spending shows a steady monthly increase of ~5%. Lock in current rates with a 1-year commitment to AWS or Azure to prevent further price creep.",
                "estimated_savings": 12000.00,
                "confidence": 0.85,
                "risk_level": "low",
                "pros": ["Predictable costs", "Price protection", "Common industry practice"],
                "cons": ["Reduced flexibility", "Commitment required"],
            },
            {
                "id": "c3",
                "title": "Eliminate Duplicate Software Licenses",
                "description": "Both Zoom and Zoom Video, and Slack and Slack Technologies appear as separate vendors - likely duplicate licenses across departments. Consolidate to single enterprise agreements.",
                "estimated_savings": 6000.00,
                "confidence": 0.88,
                "risk_level": "low",
                "pros": ["Direct cost reduction", "Better license management", "Easy to implement"],
                "cons": ["Requires cross-department coordination"],
            },
        ],
        total_savings=26500.00,
        summary="Conservative analysis identifies $26,500 in low-risk savings through vendor consolidation, cloud contract renegotiation, and duplicate license elimination. All recommendations maintain existing vendor relationships and minimize operational disruption.",
    ),
    "aggressive": AgentResult(
        agent_type="aggressive",
        recommendations=[
            {
                "id": "a1",
                "title": "Switch to Single Cloud Provider",
                "description": "Consolidate all cloud spending to a single provider (AWS) and negotiate enterprise pricing. Currently spending across AWS, Azure, Google Cloud, and DigitalOcean. A single provider deal with committed spend could yield 30-40% savings.",
                "estimated_savings": 45000.00,
                "confidence": 0.55,
                "risk_level": "high",
                "pros": ["Massive cost reduction", "Simplified architecture", "Better support tier"],
                "cons": ["Migration risk", "Single point of failure", "Engineering effort required"],
            },
            {
                "id": "a2",
                "title": "Replace Big-4 Consulting with Boutique Firms",
                "description": "Consulting spend with Deloitte, McKinsey, and PwC is extremely high. Replace with specialized boutique consulting firms at 40-60% lower rates.",
                "estimated_savings": 65000.00,
                "confidence": 0.50,
                "risk_level": "high",
                "pros": ["Dramatic cost reduction", "More specialized expertise", "Better engagement"],
                "cons": ["Relationship risk", "Unproven vendors", "Possible quality variance"],
            },
            {
                "id": "a3",
                "title": "Automate Office Supply Procurement",
                "description": "Implement automated procurement platform to replace all 5 office supply vendors. Use Amazon Business or similar with auto-approval workflows.",
                "estimated_savings": 15000.00,
                "confidence": 0.65,
                "risk_level": "medium",
                "pros": ["Process automation", "Price transparency", "Reduced admin costs"],
                "cons": ["Implementation effort", "Change management needed"],
            },
            {
                "id": "a4",
                "title": "Eliminate Non-Essential Travel",
                "description": "Mandate virtual-first policy and cut travel budget by 60%. With modern video conferencing already in place (Zoom), most travel is unnecessary.",
                "estimated_savings": 35000.00,
                "confidence": 0.60,
                "risk_level": "medium",
                "pros": ["Immediate savings", "Environmental benefit", "Already have tools"],
                "cons": ["Client relationship impact", "Employee satisfaction", "Cultural pushback"],
            },
            {
                "id": "a5",
                "title": "Consolidate Marketing to In-House",
                "description": "Bring Google Ads and Facebook Ads management in-house instead of through agencies. Hire one specialist to replace external spend.",
                "estimated_savings": 20000.00,
                "confidence": 0.45,
                "risk_level": "high",
                "pros": ["Long-term cost control", "Faster iteration", "Better data ownership"],
                "cons": ["Hiring risk", "Transition period", "Loss of agency expertise"],
            },
        ],
        total_savings=180000.00,
        summary="Aggressive analysis identifies $180,000 in potential savings through bold moves: cloud consolidation, consulting firm replacement, procurement automation, travel elimination, and marketing in-housing. High reward requires accepting higher risk and significant organizational change.",
    ),
    "balanced": AgentResult(
        agent_type="balanced",
        recommendations=[
            {
                "id": "b1",
                "title": "Strategic Office Supply Consolidation",
                "description": "Reduce from 5 office supply vendors to 2 preferred vendors. Keep Staples as primary and Office Depot as backup. Negotiate volume pricing while maintaining competitive tension.",
                "estimated_savings": 10000.00,
                "confidence": 0.88,
                "risk_level": "low",
                "pros": ["Volume discounts", "Maintains competition", "Easy implementation"],
                "cons": ["Moderate savings", "Still some fragmentation"],
            },
            {
                "id": "b2",
                "title": "Cloud Cost Optimization Program",
                "description": "Address the 5% monthly cost creep in cloud services through reserved instances, rightsizing, and spending alerts. Don't switch providers but optimize within each.",
                "estimated_savings": 25000.00,
                "confidence": 0.78,
                "risk_level": "medium",
                "pros": ["No migration risk", "Addresses root cause", "Scalable approach"],
                "cons": ["Requires ongoing monitoring", "Engineering involvement needed"],
            },
            {
                "id": "b3",
                "title": "Software License Audit & Consolidation",
                "description": "Eliminate confirmed duplicate licenses (Zoom/Zoom Video, Slack/Slack Technologies) and audit actual usage of all software. Right-size licenses based on usage data.",
                "estimated_savings": 12000.00,
                "confidence": 0.82,
                "risk_level": "low",
                "pros": ["Clear ROI", "Improved visibility", "Compliance benefit"],
                "cons": ["Audit takes time", "Some departmental pushback"],
            },
            {
                "id": "b4",
                "title": "Selective Consulting Renegotiation",
                "description": "Renegotiate the top 2 consulting engagements by spend. Use competitive bids from boutique firms as leverage but don't necessarily switch. Target 15-20% rate reduction.",
                "estimated_savings": 30000.00,
                "confidence": 0.65,
                "risk_level": "medium",
                "pros": ["Significant savings", "Keeps relationships", "Market-based pricing"],
                "cons": ["Negotiation effort", "May strain relationships"],
            },
        ],
        total_savings=77000.00,
        summary="Balanced analysis identifies $77,000 in savings mixing low-risk quick wins with strategic medium-risk plays. Recommends office supply consolidation, cloud optimization, license audit, and selective consulting renegotiation. Approach balances savings potential with operational stability.",
    ),
}


# ---------------------------------------------------------------------------
# Node factories for the LangGraph
# ---------------------------------------------------------------------------

def _make_step_node(agent_type: str, step_index: int):
    """Return a graph node coroutine for one thinking step."""
    steps = THINKING_STEPS[agent_type]
    step_text = steps[step_index]
    progress = int((step_index + 1) / (len(steps) + 1) * 100)

    async def node(state: ArenaState) -> dict:
        # Simulate thinking time (varies per step to stagger agents)
        delay = THINKING_STEP_BASE_DELAY + (hash(agent_type + step_text) % THINKING_STEP_JITTER) / THINKING_STEP_JITTER
        await asyncio.sleep(delay)
        return {
            "events": [
                {
                    "agent": agent_type,
                    "status": "thinking",
                    "step": step_text,
                    "progress": progress,
                }
            ]
        }

    node.__name__ = f"{agent_type}_step_{step_index}"
    return node


def _make_analyze_node(agent_type: str):
    """Return a graph node coroutine for the final LLM analysis."""

    async def node(state: ArenaState) -> dict:
        summary = DataSummary(**state["summary"])
        preferences = state.get("preferences", "")

        if MOCK_AGENTS or not OPENAI_API_KEY:
            logger.info("Agent '%s' using mock results", agent_type)
            result = MOCK_RESULTS[agent_type]
        else:
            logger.info("Agent '%s' calling OpenAI (%s)%s", agent_type, OPENAI_MODEL,
                        " with preferences" if preferences else "")
            try:
                result = await _call_openai(agent_type, summary, preferences)
            except Exception as e:
                logger.error("OpenAI call failed for agent '%s': %s", agent_type, e, exc_info=True)
                raise

        result_dict = result.model_dump()
        return {
            "events": [
                {
                    "agent": agent_type,
                    "status": "complete",
                    "progress": 100,
                    "result": result_dict,
                }
            ]
        }

    node.__name__ = f"{agent_type}_analyze"
    return node


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_arena_graph():
    """Build and compile the LangGraph that runs all 3 agents in parallel.

    Structure (fan-out / fan-in):

        START ─┬─> conservative_step_0 -> ... -> conservative_analyze ─┬─> END
               ├─> aggressive_step_0   -> ... -> aggressive_analyze   ─┤
               └─> balanced_step_0     -> ... -> balanced_analyze     ─┘
    """
    builder = StateGraph(ArenaState)

    for agent_type in ("conservative", "aggressive", "balanced"):
        steps = THINKING_STEPS[agent_type]

        # Add a node for each thinking step
        for i in range(len(steps)):
            name = f"{agent_type}_step_{i}"
            builder.add_node(name, _make_step_node(agent_type, i))

        # Add the final analysis node
        analyze_name = f"{agent_type}_analyze"
        builder.add_node(analyze_name, _make_analyze_node(agent_type))

        # Wire edges: START -> step_0 -> step_1 -> ... -> step_n -> analyze -> END
        first = f"{agent_type}_step_0"
        builder.add_edge(START, first)

        for i in range(len(steps) - 1):
            builder.add_edge(f"{agent_type}_step_{i}", f"{agent_type}_step_{i + 1}")

        last_step = f"{agent_type}_step_{len(steps) - 1}"
        builder.add_edge(last_step, analyze_name)
        builder.add_edge(analyze_name, END)

    return builder.compile()


# ---------------------------------------------------------------------------
# OpenAI helper (used when MOCK_AGENTS=false)
# ---------------------------------------------------------------------------

_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


async def _call_openai(agent_type: str, summary: DataSummary, preferences: str = "") -> AgentResult:
    """Call OpenAI to get agent recommendations."""
    client = _get_openai_client()

    data_text = f"""Procurement Spend Data Summary:
- Total Spend: ${summary.total_spend:,.2f}
- Transactions: {summary.row_count}
- Date Range: {summary.date_range}

Top Vendors by Spend:
{_format_list(summary.top_vendors, 'vendor', 'total_spend')}

Spend by Category:
{_format_list(summary.category_breakdown, 'category', 'total_spend')}

Spend by Department:
{_format_list(summary.department_breakdown, 'department', 'total_spend')}

Monthly Trends:
{_format_list(summary.monthly_trends, 'month', 'total_spend')}

Potential Duplicate Vendors Detected:
{chr(10).join('- ' + d for d in summary.duplicate_vendors) if summary.duplicate_vendors else 'None detected'}
"""

    if preferences:
        data_text += f"\n\n--- USER PREFERENCES ---\n{preferences}\n"

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": AGENT_PROMPTS[agent_type]},
            {"role": "user", "content": data_text},
        ],
        response_format={"type": "json_object"},
        temperature=OPENAI_TEMPERATURE,
    )

    content = response.choices[0].message.content
    data = json.loads(content)

    # Sanitize risk_level — LLMs sometimes return values like "medium-high"
    valid_risk_levels = {"low", "medium", "high"}
    for rec in data.get("recommendations", []):
        risk = rec.get("risk_level", "medium").lower()
        if risk not in valid_risk_levels:
            # Map common variants to valid values
            if "high" in risk:
                rec["risk_level"] = "high"
            elif "low" in risk:
                rec["risk_level"] = "low"
            else:
                rec["risk_level"] = "medium"

    return AgentResult(
        agent_type=agent_type,
        recommendations=data["recommendations"],
        total_savings=data["total_savings"],
        summary=data["summary"],
    )


def _format_list(items: list, name_key: str, value_key: str) -> str:
    lines = []
    for item in items:
        name = getattr(item, name_key, "Unknown")
        value = getattr(item, value_key, 0)
        lines.append(f"- {name}: ${value:,.2f}")
    return "\n".join(lines)
