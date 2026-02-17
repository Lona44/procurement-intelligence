"use client";

import AgentCard from "./AgentCard";
import ComparisonTable from "./ComparisonTable";
import BehaviouralInsight from "./BehaviouralInsight";
import type { AgentType } from "@/types";

const AGENTS: AgentType[] = ["conservative", "aggressive", "balanced"];

export default function ArenaBoard() {
  return (
    <div className="space-y-6">
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
