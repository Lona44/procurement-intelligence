/**
 * VotePanel component tests.
 *
 * Verifies vote button rendering, click behavior, and disabled state.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, Provider } from "jotai";
import { sessionIdAtom, votesAtom, votedRecsAtom } from "@/store/atoms";
import VotePanel from "@/components/VotePanel";
import type { Recommendation } from "@/types";

vi.mock("framer-motion", async () => {
  return await import("@/test/__mocks__/framer-motion");
});

const mockCastVote = vi.fn().mockResolvedValue({
  votes: { conservative: 1, aggressive: 0, balanced: 0 },
});

vi.mock("@/lib/api", () => ({
  castVote: (...args: unknown[]) => mockCastVote(...args),
}));

const testRec: Recommendation = {
  id: "c1",
  title: "Test Recommendation",
  description: "Test description",
  estimated_savings: 5000,
  confidence: 0.9,
  risk_level: "low",
  pros: ["Pro 1"],
  cons: ["Con 1"],
};

describe("VotePanel", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(sessionIdAtom, "test-session");
    store.set(votesAtom, { conservative: 0, aggressive: 0, balanced: 0 });
    store.set(votedRecsAtom, []);
    mockCastVote.mockClear();
  });

  it('renders enabled "Upvote" button', () => {
    render(
      React.createElement(
        Provider,
        { store },
        React.createElement(VotePanel, {
          agentType: "conservative",
          recommendation: testRec,
        })
      )
    );

    const button = screen.getByRole("button", { name: /upvote/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("click calls castVote with correct 5 arguments", async () => {
    const user = userEvent.setup();

    render(
      React.createElement(
        Provider,
        { store },
        React.createElement(VotePanel, {
          agentType: "conservative",
          recommendation: testRec,
        })
      )
    );

    const button = screen.getByRole("button", { name: /upvote/i });
    await user.click(button);

    expect(mockCastVote).toHaveBeenCalledWith(
      "test-session",
      "conservative",
      "c1",
      "Test Recommendation",
      "Test description"
    );
  });

  it('shows "Voted" disabled state after click', async () => {
    const user = userEvent.setup();

    render(
      React.createElement(
        Provider,
        { store },
        React.createElement(VotePanel, {
          agentType: "conservative",
          recommendation: testRec,
        })
      )
    );

    const button = screen.getByRole("button", { name: /upvote/i });
    await user.click(button);

    // After voting, button should show "Voted" and be disabled
    const votedButton = await screen.findByRole("button", { name: /voted/i });
    expect(votedButton).toBeDisabled();
  });

  it("already-voted renders disabled from start", () => {
    // Set up store with this rec already voted
    store.set(votedRecsAtom, [{ agentType: "conservative", recommendationId: "c1" }]);

    render(
      React.createElement(
        Provider,
        { store },
        React.createElement(VotePanel, {
          agentType: "conservative",
          recommendation: testRec,
        })
      )
    );

    const button = screen.getByRole("button", { name: /voted/i });
    expect(button).toBeDisabled();
  });
});
