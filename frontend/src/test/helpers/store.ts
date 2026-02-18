/**
 * Jotai store helpers for frontend tests.
 *
 * Provides pre-configured stores with realistic agent data
 * for testing components that read from Jotai atoms.
 */

import React from "react";
import { createStore } from "jotai";
import { render } from "@testing-library/react";
import { Provider } from "jotai/react";
import { agentAtomFamily, sessionIdAtom } from "@/store/atoms";
import type { AgentState, AgentType, Recommendation } from "@/types";

/** A realistic recommendation for testing. */
function makeRecommendation(
  id: string,
  title: string,
  savings: number,
  confidence: number,
  risk: "low" | "medium" | "high"
): Recommendation {
  return {
    id,
    title,
    description: `Description for ${title}`,
    estimated_savings: savings,
    confidence,
    risk_level: risk,
    pros: ["Pro 1", "Pro 2"],
    cons: ["Con 1"],
  };
}

/** Build a complete AgentState for testing. */
function makeCompleteAgent(type: AgentType): AgentState {
  const recs: Record<AgentType, Recommendation[]> = {
    conservative: [
      makeRecommendation("c1", "Consolidate Vendors", 8500, 0.92, "low"),
      makeRecommendation("c2", "Renegotiate Cloud", 12000, 0.85, "low"),
    ],
    aggressive: [
      makeRecommendation("a1", "Switch Cloud Provider", 45000, 0.55, "high"),
      makeRecommendation("a2", "Replace Consultants", 65000, 0.5, "high"),
      makeRecommendation("a3", "Automate Procurement", 15000, 0.65, "medium"),
    ],
    balanced: [
      makeRecommendation("b1", "Strategic Consolidation", 10000, 0.88, "low"),
      makeRecommendation("b2", "Cloud Optimization", 25000, 0.78, "medium"),
    ],
  };

  const savings: Record<AgentType, number> = {
    conservative: 20500,
    aggressive: 125000,
    balanced: 35000,
  };

  return {
    type,
    status: "complete",
    progress: 100,
    steps: ["Step 1", "Step 2", "Step 3"],
    recommendations: recs[type],
    total_savings: savings[type],
    summary: `Summary for ${type} agent.`,
  };
}

/**
 * Create a Jotai store with all 3 agents complete and real-shaped data.
 */
export function makeCompleteStore() {
  const store = createStore();
  store.set(sessionIdAtom, "test-session-123");

  const types: AgentType[] = ["conservative", "aggressive", "balanced"];
  for (const type of types) {
    store.set(agentAtomFamily(type), makeCompleteAgent(type));
  }

  return store;
}

/**
 * Create a Jotai store with agents in idle state.
 */
export function makeIdleStore() {
  const store = createStore();
  store.set(sessionIdAtom, "test-session-123");
  return store;
}

/**
 * Render a component wrapped in a Jotai Provider with the given store.
 */
export function renderWithStore(
  component: React.ReactElement,
  store: ReturnType<typeof createStore>
) {
  return render(React.createElement(Provider, { store }, component));
}
