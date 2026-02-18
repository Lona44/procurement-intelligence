/**
 * AgentCard component tests.
 *
 * Verifies rendering for each agent status: pending, thinking, complete, error.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { agentAtomFamily, sessionIdAtom } from "@/store/atoms";
import AgentCard from "@/components/AgentCard";
import type { AgentState, AgentType } from "@/types";

vi.mock("framer-motion", async () => {
  return await import("@/test/__mocks__/framer-motion");
});

function renderAgentCard(agentType: AgentType, state: Partial<AgentState>) {
  const store = createStore();
  store.set(sessionIdAtom, "test-session");
  store.set(agentAtomFamily(agentType), {
    type: agentType,
    status: "idle",
    progress: 0,
    steps: [],
    recommendations: [],
    total_savings: 0,
    summary: "",
    ...state,
  });

  return render(
    React.createElement(Provider, { store }, React.createElement(AgentCard, { agentType }))
  );
}

describe("AgentCard", () => {
  it('renders "Pending" badge in idle state', () => {
    renderAgentCard("conservative", { status: "idle" });
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders step list in thinking state", () => {
    renderAgentCard("aggressive", {
      status: "thinking",
      progress: 50,
      steps: ["Scanning for inefficiencies...", "Evaluating options..."],
    });

    expect(screen.getByText("Analyzing")).toBeInTheDocument();
    expect(screen.getByText("Scanning for inefficiencies...")).toBeInTheDocument();
    expect(screen.getByText("Evaluating options...")).toBeInTheDocument();
  });

  it("renders savings, summary, and recommendation titles in complete state", () => {
    renderAgentCard("balanced", {
      status: "complete",
      progress: 100,
      total_savings: 77000,
      summary: "Balanced analysis complete.",
      recommendations: [
        {
          id: "b1",
          title: "Strategic Consolidation",
          description: "Reduce vendors",
          estimated_savings: 10000,
          confidence: 0.88,
          risk_level: "low",
          pros: ["Pro"],
          cons: ["Con"],
        },
      ],
    });

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByText(/\$77,000/)).toBeInTheDocument();
    expect(screen.getByText("Balanced analysis complete.")).toBeInTheDocument();
    expect(screen.getByText("Strategic Consolidation")).toBeInTheDocument();
  });

  it('renders "Error" badge in error state', () => {
    renderAgentCard("conservative", { status: "error" });
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders recommendation risk_level, savings, and confidence", () => {
    renderAgentCard("aggressive", {
      status: "complete",
      progress: 100,
      total_savings: 45000,
      summary: "Test",
      recommendations: [
        {
          id: "a1",
          title: "Switch Cloud Provider",
          description: "Consolidate cloud",
          estimated_savings: 30000,
          confidence: 0.55,
          risk_level: "high",
          pros: ["Savings"],
          cons: ["Risk"],
        },
      ],
    });

    expect(screen.getByText("high")).toBeInTheDocument();
    // Check recommendation-level savings (distinct from total)
    expect(screen.getByText(/\$30,000/)).toBeInTheDocument();
    expect(screen.getByText(/55%/)).toBeInTheDocument();
  });
});
