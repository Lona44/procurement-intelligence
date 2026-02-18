/**
 * ComparisonTable component tests.
 *
 * Verifies table visibility, metric rows, and edge cases.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "jotai/react";
import { agentAtomFamily } from "@/store/atoms";
import ComparisonTable from "@/components/ComparisonTable";
import { makeCompleteStore, makeIdleStore } from "./helpers/store";

vi.mock("framer-motion", async () => {
  return await import("@/test/__mocks__/framer-motion");
});

describe("ComparisonTable", () => {
  it("renders nothing when not all agents complete", () => {
    const store = makeIdleStore();
    const { container } = render(
      React.createElement(Provider, { store }, React.createElement(ComparisonTable))
    );

    // Should render null (empty)
    expect(container.innerHTML).toBe("");
  });

  it("shows all 4 metric rows with computed values when complete", () => {
    const store = makeCompleteStore();
    render(React.createElement(Provider, { store }, React.createElement(ComparisonTable)));

    // Check metric labels
    expect(screen.getByText("Total Savings")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Avg Confidence")).toBeInTheDocument();
    expect(screen.getByText("Top Recommendation")).toBeInTheDocument();

    // Check agent labels in header
    expect(screen.getByText("Conservative")).toBeInTheDocument();
    expect(screen.getByText("Aggressive")).toBeInTheDocument();
    expect(screen.getByText("Balanced")).toBeInTheDocument();
  });

  it("handles agent with 0 recommendations without crashing", () => {
    const store = makeCompleteStore();

    // Override one agent to have 0 recommendations
    store.set(agentAtomFamily("balanced"), {
      type: "balanced" as const,
      status: "complete" as const,
      progress: 100,
      steps: [],
      recommendations: [],
      total_savings: 0,
      summary: "No recommendations",
    });

    // Should not throw
    expect(() => {
      render(React.createElement(Provider, { store }, React.createElement(ComparisonTable)));
    }).not.toThrow();
  });
});
