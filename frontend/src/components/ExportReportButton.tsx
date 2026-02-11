"use client";

import { useState, useCallback } from "react";
import { useAtom } from "jotai";
import { motion } from "framer-motion";
import { sessionIdAtom, agentAtomFamily, votedRecsAtom } from "@/store/atoms";
import { exportReport } from "@/lib/api";
import { ANIM } from "@/lib/constants";
import type { AgentType, AgentResult } from "@/types";

const AGENT_TYPES: AgentType[] = ["conservative", "aggressive", "balanced"];

export default function ExportReportButton() {
  const [sessionId] = useAtom(sessionIdAtom);
  const [conservative] = useAtom(agentAtomFamily("conservative"));
  const [aggressive] = useAtom(agentAtomFamily("aggressive"));
  const [balanced] = useAtom(agentAtomFamily("balanced"));
  const [votedRecs] = useAtom(votedRecsAtom);
  const [loading, setLoading] = useState(false);

  const allComplete = AGENT_TYPES.every((type) => {
    const agent = { conservative, aggressive, balanced }[type];
    return agent.status === "complete";
  });

  const handleExport = useCallback(async () => {
    if (!sessionId || loading) return;

    setLoading(true);
    try {
      const agents: AgentResult[] = [conservative, aggressive, balanced].map((a) => ({
        agent_type: a.type,
        recommendations: a.recommendations,
        total_savings: a.total_savings,
        summary: a.summary,
      }));

      const votedIds = votedRecs.map((v) => v.recommendationId);

      const { blob, filename } = await exportReport(sessionId, agents, votedIds);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading, conservative, aggressive, balanced, votedRecs]);

  if (!allComplete) return null;

  return (
    <motion.button
      onClick={handleExport}
      disabled={loading}
      className="text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all px-4 py-2 rounded-lg shadow-[0_1px_2px_0_rgb(0_0_0/0.06)] hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.1)] flex items-center gap-2"
      {...ANIM.buttonTap}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
      {loading ? "Generating..." : "Export PDF Report"}
    </motion.button>
  );
}
