/**
 * ExportReportButton component tests.
 *
 * Verifies visibility, click behavior, and loading state.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "jotai/react";
import ExportReportButton from "@/components/ExportReportButton";
import { makeCompleteStore, makeIdleStore } from "./helpers/store";

vi.mock("framer-motion", async () => {
  return await import("@/test/__mocks__/framer-motion");
});

let resolveExport: (value: { blob: Blob; filename: string }) => void;

const mockExportReport = vi.fn<(sessionId: string) => Promise<{ blob: Blob; filename: string }>>(
  () =>
    new Promise<{ blob: Blob; filename: string }>((resolve) => {
      resolveExport = resolve;
    })
);

vi.mock("@/lib/api", () => ({
  exportReport: (sessionId: string) => mockExportReport(sessionId),
}));

describe("ExportReportButton", () => {
  beforeEach(() => {
    mockExportReport.mockClear();
    // Reset to a controllable promise
    mockExportReport.mockImplementation(
      () =>
        new Promise<{ blob: Blob; filename: string }>((resolve) => {
          resolveExport = resolve;
        })
    );
  });

  it("hidden when not all agents complete", () => {
    const store = makeIdleStore();
    const { container } = render(
      React.createElement(Provider, { store }, React.createElement(ExportReportButton))
    );
    expect(container.innerHTML).toBe("");
  });

  it("click calls exportReport(sessionId)", async () => {
    const user = userEvent.setup();
    const store = makeCompleteStore();

    // Mock immediate resolve for this test
    mockExportReport.mockResolvedValueOnce({
      blob: new Blob(["pdf-content"], { type: "application/pdf" }),
      filename: "test_report.pdf",
    });

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:test");
    const mockRevokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    render(React.createElement(Provider, { store }, React.createElement(ExportReportButton)));

    const button = screen.getByRole("button", { name: /export pdf/i });
    await user.click(button);

    expect(mockExportReport).toHaveBeenCalledWith("test-session-123");
  });

  it("shows loading state while generating", async () => {
    const user = userEvent.setup();
    const store = makeCompleteStore();

    render(React.createElement(Provider, { store }, React.createElement(ExportReportButton)));

    const button = screen.getByRole("button", { name: /export pdf/i });
    // Click but don't resolve yet
    await user.click(button);

    // Should show "Generating..." while loading
    expect(screen.getByText("Generating...")).toBeInTheDocument();

    // Resolve the promise
    await act(async () => {
      resolveExport({
        blob: new Blob(["pdf"], { type: "application/pdf" }),
        filename: "report.pdf",
      });
    });
  });
});
