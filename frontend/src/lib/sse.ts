import type { SSEEvent } from "@/types";

const API_BASE = "http://localhost:8000";

export function connectSSE(
  sessionId: string,
  onEvent: (event: SSEEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analyze/${sessionId}`, {
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        onError(new Error("Failed to connect to analysis stream"));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const event: SSEEvent = JSON.parse(jsonStr);
              if (event.type === "done") {
                onDone();
                return;
              }
              onEvent(event);
            } catch {
              // skip malformed JSON
            }
          }
        }
      }

      onDone();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError(err as Error);
      }
    }
  })();

  return () => controller.abort();
}
