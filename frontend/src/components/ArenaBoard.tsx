"use client";

import { useAtomValue } from "jotai";
import AgentCard from "./AgentCard";
import ComparisonTable from "./ComparisonTable";
import BehaviouralInsight from "./BehaviouralInsight";
import { mockModeAtom, allAgentsCompleteAtom } from "@/store/atoms";
import type { AgentType } from "@/types";

const AGENTS: AgentType[] = ["conservative", "aggressive", "balanced"];

export default function ArenaBoard() {
  const mockMode = useAtomValue(mockModeAtom);
  const allComplete = useAtomValue(allAgentsCompleteAtom);

  return (
    <div className="space-y-6">
      {mockMode.active && allComplete && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            <strong>Mock mode</strong> &mdash; {mockMode.reason}. Add an API key to{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env</code> and set{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">MOCK_AGENTS=false</code> for
            real AI analysis.
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {AGENTS.map((type) => (
          <AgentCard key={type} agentType={type} />
        ))}
      </div>
      <ComparisonTable />
      <BehaviouralInsight />
    </div>
  );
}
