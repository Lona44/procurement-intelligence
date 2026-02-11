"use client";

import { Suspense, useEffect, useRef, useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionIdAtom, agentAtomFamily, arenaStartedAtom } from "@/store/atoms";
import { connectSSE } from "@/lib/sse";
import { EASE, ANIM } from "@/lib/constants";
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
  const startedRef = useRef(arenaStarted);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setters = useMemo<Record<AgentType, typeof setConservative>>(
    () => ({
      conservative: setConservative,
      aggressive: setAggressive,
      balanced: setBalanced,
    }),
    [setConservative, setAggressive, setBalanced]
  );

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
    [setters]
  );

  useEffect(() => {
    const paramSession = searchParams.get("session");
    if (paramSession && paramSession !== sessionId) {
      setSessionId(paramSession);
    }
    if (!paramSession && !sessionId) {
      router.push("/upload");
    }
  }, [searchParams, sessionId, setSessionId, router]);

  // Sync atom → ref (so the ref always reflects the latest atom value)
  useEffect(() => {
    startedRef.current = arenaStarted;
  }, [arenaStarted]);

  useEffect(() => {
    const sid = sessionId || searchParams.get("session");
    if (!sid || startedRef.current) return;

    startedRef.current = true;
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
  }, [sessionId, searchParams]);

  return (
    <main className="min-h-screen bg-grid p-6 lg:p-8 max-w-[1400px] mx-auto">
      <motion.div
        className="flex items-center justify-between mb-8"
        {...ANIM.fadeInUp}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Agent Arena</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Analyzing procurement data across three strategies
          </p>
        </div>
        <motion.button
          onClick={() => {
            setArenaStarted(false);
            router.push("/upload");
          }}
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-all px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.06)]"
          {...ANIM.buttonTap}
        >
          New Analysis
        </motion.button>
      </motion.div>
      <motion.div {...ANIM.fadeInUp} transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
        <ArenaBoard />
      </motion.div>
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
