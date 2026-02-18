/**
 * SSE parser unit tests.
 *
 * Tests the connectSSE function by mocking fetch to return
 * controlled ReadableStreams.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { connectSSE } from "@/lib/sse";
import { createSSEStream } from "./helpers/sse-mock";

// Mock the API_BASE constant
vi.mock("@/lib/constants", () => ({
  API_BASE: "http://test-api",
}));

describe("connectSSE", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls onEvent for thinking events", async () => {
    const events = [
      'data: {"agent":"conservative","status":"thinking","step":"Reviewing...","progress":25}',
      'data: {"agent":"conservative","status":"thinking","step":"Analyzing...","progress":50}',
      'data: {"type":"done"}',
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    });

    const onEvent = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    connectSSE("session-1", onEvent, onDone, onError);

    // Wait for async processing
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 2000 });

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ agent: "conservative", status: "thinking", step: "Reviewing..." })
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onDone for {"type":"done"} event', async () => {
    const events = [
      'data: {"agent":"balanced","status":"complete","result":{"agent_type":"balanced","recommendations":[],"total_savings":0,"summary":"test"}}',
      'data: {"type":"done"}',
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    });

    const onEvent = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    connectSSE("session-2", onEvent, onDone, onError);

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 2000 });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("handles chunked data split across reads", async () => {
    // Simulate data split across multiple chunks
    const encoder = new TextEncoder();
    const fullLine =
      'data: {"agent":"aggressive","status":"thinking","step":"Scanning...","progress":20}\n\n';

    // Split the line in the middle
    const bytes = encoder.encode(fullLine);
    const mid = Math.floor(bytes.length / 2);
    const chunk1 = bytes.slice(0, mid);
    const chunk2 = bytes.slice(mid);

    const doneBytes = encoder.encode('data: {"type":"done"}\n\n');

    let callCount = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (callCount === 0) {
          controller.enqueue(chunk1);
        } else if (callCount === 1) {
          controller.enqueue(chunk2);
        } else if (callCount === 2) {
          controller.enqueue(doneBytes);
        } else {
          controller.close();
        }
        callCount++;
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onEvent = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    connectSSE("session-3", onEvent, onDone, onError);

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 2000 });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ agent: "aggressive", status: "thinking" })
    );
  });

  it("ignores malformed JSON without crashing", async () => {
    const events = [
      "data: {not valid json",
      'data: {"agent":"conservative","status":"thinking","step":"OK","progress":10}',
      'data: {"type":"done"}',
    ];

    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    });

    const onEvent = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    connectSSE("session-4", onEvent, onDone, onError);

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 2000 });

    // Only the valid thinking event should be passed through
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("calls onError on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const onEvent = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    connectSSE("session-5", onEvent, onDone, onError);

    await vi.waitFor(() => expect(onError).toHaveBeenCalled(), { timeout: 2000 });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onEvent).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("cleanup function aborts without triggering onError", async () => {
    // Create a stream that will never complete on its own
    const stream = new ReadableStream<Uint8Array>({
      start() {
        // intentionally never enqueues or closes
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onEvent = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    const cleanup = connectSSE("session-6", onEvent, onDone, onError);

    // Give the async IIFE time to start
    await new Promise((r) => setTimeout(r, 50));

    // Abort the connection
    cleanup();

    // Wait a bit to ensure no error callback fires
    await new Promise((r) => setTimeout(r, 100));

    expect(onError).not.toHaveBeenCalled();
  });

  it("complete event passes through full result shape", async () => {
    const result = {
      agent_type: "balanced",
      recommendations: [
        {
          id: "b1",
          title: "Test Rec",
          description: "Test desc",
          estimated_savings: 5000,
          confidence: 0.85,
          risk_level: "low",
          pros: ["Pro 1"],
          cons: ["Con 1"],
        },
      ],
      total_savings: 5000,
      summary: "Test summary",
    };

    const events = [
      `data: {"agent":"balanced","status":"complete","progress":100,"result":${JSON.stringify(result)}}`,
      'data: {"type":"done"}',
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createSSEStream(events),
    });

    const onEvent = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    connectSSE("session-7", onEvent, onDone, onError);

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 2000 });

    expect(onEvent).toHaveBeenCalledTimes(1);
    const received = onEvent.mock.calls[0][0];
    expect(received.result).toBeDefined();
    expect(received.result.agent_type).toBe("balanced");
    expect(received.result.recommendations).toHaveLength(1);
    expect(received.result.total_savings).toBe(5000);
    expect(received.result.summary).toBe("Test summary");
  });
});
