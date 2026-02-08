"use client";

import { useAtom } from "jotai";
import { agentAtomFamily } from "@/store/atoms";
import type { AgentType } from "@/types";
import ProgressBar from "./ProgressBar";
import RecommendationList from "./RecommendationList";

const AGENT_CONFIG: Record<
  AgentType,
  { label: string; color: string; emoji: string; tagline: string }
> = {
  conservative: {
    label: "Conservative",
    color: "#22c55e",
    emoji: "🛡️",
    tagline: "Low risk, proven strategies",
  },
  aggressive: {
    label: "Aggressive",
    color: "#ef4444",
    emoji: "⚡",
    tagline: "Bold moves, maximum savings",
  },
  balanced: {
    label: "Balanced",
    color: "#3b82f6",
    emoji: "⚖️",
    tagline: "Risk-weighted optimization",
  },
};

interface AgentCardProps {
  agentType: AgentType;
}

export default function AgentCard({ agentType }: AgentCardProps) {
  const [state] = useAtom(agentAtomFamily(agentType));
  const config = AGENT_CONFIG[agentType];

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">{config.emoji}</span>
        <div>
          <h3 className="text-lg font-bold text-zinc-100">{config.label}</h3>
          <p className="text-xs text-zinc-500">{config.tagline}</p>
        </div>
        <div className="ml-auto">
          {state.status === "idle" && (
            <span className="text-xs text-zinc-600 px-2 py-1 rounded-full bg-zinc-800">
              Waiting
            </span>
          )}
          {state.status === "thinking" && (
            <span
              className="text-xs px-2 py-1 rounded-full animate-pulse"
              style={{
                color: config.color,
                backgroundColor: `${config.color}20`,
              }}
            >
              Analyzing...
            </span>
          )}
          {state.status === "complete" && (
            <span className="text-xs text-emerald-400 px-2 py-1 rounded-full bg-emerald-400/10">
              Done
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="my-3">
        <ProgressBar progress={state.progress} color={config.color} />
      </div>

      {/* Thinking steps */}
      {state.steps.length > 0 && (
        <div className="space-y-1 mb-3">
          {state.steps.map((step, i) => (
            <div
              key={i}
              className="text-xs text-zinc-400 flex items-center gap-2"
            >
              <span style={{ color: config.color }}>
                {i === state.steps.length - 1 && state.status === "thinking"
                  ? "▸"
                  : "✓"}
              </span>
              {step}
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {state.status === "complete" && (
        <>
          <div
            className="text-center py-3 rounded-lg mb-3"
            style={{ backgroundColor: `${config.color}10` }}
          >
            <div className="text-2xl font-bold" style={{ color: config.color }}>
              ${state.total_savings.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500">Total potential savings</div>
          </div>

          {state.summary && (
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              {state.summary}
            </p>
          )}

          <RecommendationList
            recommendations={state.recommendations}
            accentColor={config.color}
            agentType={agentType}
          />
        </>
      )}
    </div>
  );
}
