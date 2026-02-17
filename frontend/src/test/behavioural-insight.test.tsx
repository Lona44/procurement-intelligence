import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { AgentType } from "@/types";
import { votesAtom, agentAtomFamily } from "@/store/atoms";

// Mock framer-motion
vi.mock("framer-motion", async () => await import("./__mocks__/framer-motion"));

import BehaviouralInsight from "@/components/BehaviouralInsight";

/** Helper: create a Jotai store with given votes and agent statuses. */
function makeStore(
  votes: Record<AgentType, number>,
  agentStatuses: Record<AgentType, "idle" | "thinking" | "complete" | "error"> = {
    conservative: "complete",
    aggressive: "complete",
    balanced: "complete",
  }
) {
  const store = createStore();
  store.set(votesAtom, votes);
  for (const agent of ["conservative", "aggressive", "balanced"] as AgentType[]) {
    store.set(agentAtomFamily(agent), {
      type: agent,
      status: agentStatuses[agent],
      progress: agentStatuses[agent] === "complete" ? 100 : 0,
      steps: [],
      recommendations: [],
      total_savings: 0,
      summary: "",
    });
  }
  return store;
}

function renderWith(store: ReturnType<typeof createStore>) {
  return render(
    <Provider store={store}>
      <BehaviouralInsight />
    </Provider>
  );
}

describe("BehaviouralInsight", () => {
  it("renders nothing when no votes are cast", () => {
    const store = makeStore({ conservative: 0, aggressive: 0, balanced: 0 });
    const { container } = renderWith(store);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when agents are not all complete", () => {
    const store = makeStore(
      { conservative: 3, aggressive: 0, balanced: 0 },
      {
        conservative: "complete",
        aggressive: "thinking",
        balanced: "idle",
      }
    );
    const { container } = renderWith(store);
    expect(container.innerHTML).toBe("");
  });

  it('shows "Risk-Averse Strategist" for conservative-heavy votes', () => {
    const store = makeStore({ conservative: 5, aggressive: 1, balanced: 1 });
    renderWith(store);
    expect(screen.getByText("Risk-Averse Strategist")).toBeInTheDocument();
  });

  it('shows "Bold Optimizer" for aggressive-heavy votes', () => {
    const store = makeStore({ conservative: 1, aggressive: 5, balanced: 1 });
    renderWith(store);
    expect(screen.getByText("Bold Optimizer")).toBeInTheDocument();
  });

  it('shows "Pragmatic Planner" for balanced-heavy votes', () => {
    const store = makeStore({ conservative: 1, aggressive: 1, balanced: 5 });
    renderWith(store);
    expect(screen.getByText("Pragmatic Planner")).toBeInTheDocument();
  });

  it('shows "Strategic Thinker" for a tie', () => {
    const store = makeStore({ conservative: 3, aggressive: 3, balanced: 3 });
    renderWith(store);
    expect(screen.getByText("Strategic Thinker")).toBeInTheDocument();
  });

  it("displays vote distribution bars", () => {
    const store = makeStore({ conservative: 3, aggressive: 1, balanced: 2 });
    renderWith(store);
    // Should show vote counts
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
