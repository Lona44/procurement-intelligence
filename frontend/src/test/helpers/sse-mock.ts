/**
 * SSE mock helpers for frontend tests.
 *
 * Provides utilities to create mock ReadableStreams that simulate
 * SSE responses from the backend.
 */

import { vi } from "vitest";

/**
 * Create a ReadableStream<Uint8Array> that pushes encoded SSE lines.
 * Each event string should be a raw SSE line like `data: {"agent":"conservative",...}`
 */
export function createSSEStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        const line = events[index] + "\n\n";
        controller.enqueue(encoder.encode(line));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Wrap vi.fn() with a mock fetch that returns an SSE stream.
 */
export function mockSSEFetch(events: string[]) {
  const stream = createSSEStream(events);
  return vi.fn().mockResolvedValue({
    ok: true,
    body: stream,
  } as unknown as Response);
}
