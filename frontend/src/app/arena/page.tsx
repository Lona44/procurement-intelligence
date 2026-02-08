"use client";

import { Suspense, useEffect, useRef, useCallback } from "react";
import { useAtom } from "jotai";
import { useSearchParams, useRouter } from "next/navigation";
import { sessionIdAtom, agentAtomFamily, arenaStartedAtom } from "@/store/atoms";
import { connectSSE } from "@/lib/sse";
import ArenaBoard from "@/components/ArenaBoard";
import type { AgentType, SSEEvent } from "@/types";

const AGENT_TYPES: AgentType[] = ["conservative", "aggressive", "balanced"];

function ArenaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [, setConservative] = useAtom(agentAtomFamily("conservative"));
  const [, setAggressive] = useAtom(agentAtomFamily("aggressive"));
  const [, setBalanced] = useAtom(agentAtomFamily("balanced"));
  const [arenaStarted, setArenaStarted] = useAtom(arenaStartedAtom);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setters: Record<AgentType, typeof setConservative> = {
    conservative: setConservative,
    aggressive: setAggressive,
    balanced: setBalanced,
  };

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      if (!event.agent) return;
      const setter = setters[event.agent];
      if (!setter) return;

      if (event.status === "thinking") {
        setter((prev) => ({
          ...prev,
          status: "thinking",
          progress: event.progress || prev.progress,
          steps: event.step
            ? prev.steps.includes(event.step)
              ? prev.steps
              : [...prev.steps, event.step]
            : prev.steps,
        }));
      } else if (event.status === "complete" && event.result) {
        setter((prev) => ({
          ...prev,
          status: "complete",
          progress: 100,
          recommendations: event.result!.recommendations,
          total_savings: event.result!.total_savings,
          summary: event.result!.summary,
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const paramSession = searchParams.get("session");
    if (paramSession && paramSession !== sessionId) {
      setSessionId(paramSession);
    }
    if (!paramSession && !sessionId) {
      router.push("/");
    }
  }, [searchParams, sessionId, setSessionId, router]);

  useEffect(() => {
    const sid = sessionId || searchParams.get("session");
    if (!sid || arenaStarted) return;

    setArenaStarted(true);

    // Reset agent states
    AGENT_TYPES.forEach((type) => {
      setters[type]({
        type,
        status: "idle",
        progress: 0,
        steps: [],
        recommendations: [],
        total_savings: 0,
        summary: "",
      });
    });

    cleanupRef.current = connectSSE(
      sid,
      handleEvent,
      () => {
        // done
      },
      (err) => {
        console.error("SSE error:", err);
        AGENT_TYPES.forEach((type) => {
          setters[type]((prev) => ({
            ...prev,
            status: prev.status === "complete" ? "complete" : "error",
          }));
        });
      }
    );

    return () => {
      cleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Agent Arena <span className="text-blue-500">Battle</span>
          </h1>
          <p className="text-sm text-zinc-500">
            Watching 3 agents analyze your procurement data...
          </p>
        </div>
        <button
          onClick={() => {
            setArenaStarted(false);
            router.push("/");
          }}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700"
        >
          Upload New Data
        </button>
      </div>
      <ArenaBoard />
    </main>
  );
}

export default function ArenaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-zinc-500">
          Loading arena...
        </div>
      }
    >
      <ArenaContent />
    </Suspense>
  );
}
