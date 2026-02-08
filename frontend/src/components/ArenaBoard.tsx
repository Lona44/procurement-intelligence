"use client";

import AgentCard from "./AgentCard";
import ComparisonTable from "./ComparisonTable";
import type { AgentType } from "@/types";

const AGENTS: AgentType[] = ["conservative", "aggressive", "balanced"];

export default function ArenaBoard() {
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {AGENTS.map((type) => (
          <AgentCard key={type} agentType={type} />
        ))}
      </div>
      <ComparisonTable />
    </div>
  );
}
