import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Must import after stubbing fetch
import { startDemo } from "@/lib/api";

describe("startDemo", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calls POST /api/demo/start", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session_id: "demo-123" }),
    });

    await startDemo();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/demo/start");
    expect(opts.method).toBe("POST");
  });

  it("returns the session_id from the response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session_id: "demo-456", summary: {} }),
    });

    const result = await startDemo();
    expect(result.session_id).toBe("demo-456");
  });

  it("throws when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "error" }),
    });

    await expect(startDemo()).rejects.toThrow("Demo start failed");
  });
});
