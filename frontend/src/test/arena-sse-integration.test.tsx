/**
 * Arena SSE integration tests.
 *
 * Tests the integration between the Arena page, connectSSE, and Jotai atoms.
 * The "connectSSE called exactly once" test would have caught the original
 * SSE bug (useEffect re-firing due to searchParams object reference).
 */

import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { agentAtomFamily, arenaStartedAtom, mockModeAtom } from "@/store/atoms";
import type { SSEEvent } from "@/types";

// Track connectSSE calls
const mockCleanup = vi.fn();
const mockConnectSSE = vi.fn().mockReturnValue(mockCleanup);

// Mock modules before any imports use them
vi.mock("@/lib/sse", () => ({
  connectSSE: (...args: unknown[]) => mockConnectSSE(...args),
}));

vi.mock("@/lib/constants", () => ({
  API_BASE: "http://test-api",
  EASE: [0.25, 0.1, 0.25, 1],
  ANIM: {
    fadeInUp: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } },
    buttonTap: { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } },
  },
  AGENT_CONFIG: {
    conservative: { label: "Conservative", color: "#14b8a6", tagline: "Low-risk" },
    aggressive: { label: "Aggressive", color: "#f97316", tagline: "High-impact" },
    balanced: { label: "Balanced", color: "#6366f1", tagline: "Risk-weighted" },
  },
}));

vi.mock("framer-motion", async () => {
  return await import("@/test/__mocks__/framer-motion");
});

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams("session=test-session-abc");

let currentSearchParams = mockSearchParams;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => currentSearchParams,
}));

describe("Arena SSE Integration", () => {
  let store: ReturnType<typeof createStore>;
  let ArenaPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("@/app/arena/page");
    ArenaPage = mod.default;
  });

  beforeEach(() => {
    store = createStore();
    store.set(arenaStartedAtom, false);
    store.set(mockModeAtom, { active: false, reason: "" });
    mockConnectSSE.mockClear();
    mockCleanup.mockClear();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connectSSE called exactly once per session (THE SSE BUG test)", async () => {
    await act(async () => {
      render(React.createElement(Provider, { store }, React.createElement(ArenaPage)));
    });

    // connectSSE should be called exactly once
    expect(mockConnectSSE).toHaveBeenCalledTimes(1);
    expect(mockConnectSSE).toHaveBeenCalledWith(
      "test-session-abc",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("agent atoms update on thinking/complete events", async () => {
    await act(async () => {
      render(React.createElement(Provider, { store }, React.createElement(ArenaPage)));
    });

    // Get the onEvent callback that was passed to connectSSE
    const onEvent = mockConnectSSE.mock.calls[0][1] as (event: SSEEvent) => void;

    // Fire a thinking event
    act(() => {
      onEvent({
        agent: "conservative",
        status: "thinking",
        step: "Reviewing spend patterns...",
        progress: 25,
      });
    });

    const conservativeState = store.get(agentAtomFamily("conservative"));
    expect(conservativeState.status).toBe("thinking");
    expect(conservativeState.progress).toBe(25);
    expect(conservativeState.steps).toContain("Reviewing spend patterns...");

    // Fire a complete event
    act(() => {
      onEvent({
        agent: "conservative",
        status: "complete",
        progress: 100,
        result: {
          agent_type: "conservative",
          recommendations: [
            {
              id: "c1",
              title: "Test Rec",
              description: "Desc",
              estimated_savings: 5000,
              confidence: 0.9,
              risk_level: "low",
              pros: ["Pro"],
              cons: ["Con"],
            },
          ],
          total_savings: 5000,
          summary: "Test summary",
        },
      });
    });

    const updatedState = store.get(agentAtomFamily("conservative"));
    expect(updatedState.status).toBe("complete");
    expect(updatedState.total_savings).toBe(5000);
    expect(updatedState.recommendations).toHaveLength(1);
  });

  it("cleanup called on unmount", async () => {
    let unmount: () => void;

    await act(async () => {
      const result = render(
        React.createElement(Provider, { store }, React.createElement(ArenaPage))
      );
      unmount = result.unmount;
    });

    act(() => {
      unmount!();
    });

    expect(mockCleanup).toHaveBeenCalled();
  });

  it("mockModeAtom set when event has mock: true", async () => {
    await act(async () => {
      render(React.createElement(Provider, { store }, React.createElement(ArenaPage)));
    });

    const onEvent = mockConnectSSE.mock.calls[0][1] as (event: SSEEvent) => void;

    act(() => {
      onEvent({
        agent: "conservative",
        status: "complete",
        progress: 100,
        mock: true,
        mock_reason: "MOCK_AGENTS is enabled",
        result: {
          agent_type: "conservative",
          recommendations: [],
          total_savings: 0,
          summary: "Mock",
        },
      });
    });

    const mockMode = store.get(mockModeAtom);
    expect(mockMode.active).toBe(true);
    expect(mockMode.reason).toBe("MOCK_AGENTS is enabled");
  });

  it("redirects to /upload when no session", async () => {
    // Override searchParams to have no session
    currentSearchParams = new URLSearchParams("");

    // Create a fresh store with no session
    const emptyStore = createStore();
    emptyStore.set(arenaStartedAtom, false);

    await act(async () => {
      render(React.createElement(Provider, { store: emptyStore }, React.createElement(ArenaPage)));
    });

    expect(mockPush).toHaveBeenCalledWith("/upload");

    // Restore for other tests
    currentSearchParams = mockSearchParams;
  });
});
