"use client";

import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { votesAtom, agentAtomFamily } from "@/store/atoms";
import { AGENT_CONFIG, EASE } from "@/lib/constants";
import type { AgentType } from "@/types";

const AGENTS: AgentType[] = ["conservative", "aggressive", "balanced"];

interface Profile {
  title: string;
  description: string;
}

const PROFILES: Record<AgentType | "tie", Profile> = {
  conservative: {
    title: "Risk-Averse Strategist",
    description:
      "You favour proven, low-disruption approaches. Your choices lean toward steady, reliable savings that protect existing workflows.",
  },
  aggressive: {
    title: "Bold Optimizer",
    description:
      "You gravitate toward high-impact changes that maximize savings. You're willing to accept disruption for bigger rewards.",
  },
  balanced: {
    title: "Pragmatic Planner",
    description:
      "You seek the sweet spot between ambition and safety. Your votes reflect a practical mindset that weighs risk against reward.",
  },
  tie: {
    title: "Strategic Thinker",
    description:
      "Your votes are evenly distributed across strategies. You value diverse perspectives and weigh all options carefully.",
  },
};

function getLeadingAgent(votes: Record<AgentType, number>): AgentType | "tie" {
  const sorted = AGENTS.slice().sort((a, b) => votes[b] - votes[a]);
  if (votes[sorted[0]] === votes[sorted[1]]) return "tie";
  return sorted[0];
}

export default function BehaviouralInsight() {
  const votes = useAtomValue(votesAtom);
  const conservativeState = useAtomValue(agentAtomFamily("conservative"));
  const aggressiveState = useAtomValue(agentAtomFamily("aggressive"));
  const balancedState = useAtomValue(agentAtomFamily("balanced"));

  const allComplete =
    conservativeState.status === "complete" &&
    aggressiveState.status === "complete" &&
    balancedState.status === "complete";

  const totalVotes = votes.conservative + votes.aggressive + votes.balanced;

  if (!allComplete || totalVotes === 0) return null;

  const leader = getLeadingAgent(votes);
  const profile = PROFILES[leader];
  const accentColor = leader === "tie" ? "#8b5cf6" : AGENT_CONFIG[leader].color;

  return (
    <motion.div
      className="rounded-xl border p-6 shadow-sm"
      style={{ borderColor: `${accentColor}33` }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
        <h3 className="text-sm font-semibold text-zinc-900">Your Decision Profile</h3>
      </div>

      <p className="text-lg font-bold text-zinc-900 mb-1">{profile.title}</p>
      <p className="text-sm text-zinc-500 mb-5">{profile.description}</p>

      {/* Vote distribution bars */}
      <div className="space-y-2">
        {AGENTS.map((agent) => {
          const count = votes[agent];
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          return (
            <div key={agent} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-zinc-500 capitalize">{agent}</span>
              <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: AGENT_CONFIG[agent].color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              </div>
              <span className="w-6 text-right font-mono text-zinc-700">{count}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
