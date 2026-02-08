"use client";

import type { AgentType, Recommendation } from "@/types";
import VotePanel from "./VotePanel";

interface RecommendationListProps {
  recommendations: Recommendation[];
  accentColor: string;
  agentType: AgentType;
}

const riskColors = {
  low: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  high: "text-red-400 bg-red-400/10",
};

export default function RecommendationList({
  recommendations,
  accentColor,
  agentType,
}: RecommendationListProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-zinc-100">{rec.title}</h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${riskColors[rec.risk_level]}`}
            >
              {rec.risk_level}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
            {rec.description}
          </p>
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: accentColor }} className="font-semibold">
              ${rec.estimated_savings.toLocaleString()}
            </span>
            <span className="text-zinc-500">
              {Math.round(rec.confidence * 100)}% confidence
            </span>
            <div className="ml-auto">
              <VotePanel
                agentType={agentType}
                accentColor={accentColor}
                recommendation={rec}
              />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              {rec.pros.map((pro, i) => (
                <div key={i} className="text-xs text-emerald-400/80 flex items-start gap-1">
                  <span className="shrink-0">+</span>
                  <span>{pro}</span>
                </div>
              ))}
            </div>
            <div>
              {rec.cons.map((con, i) => (
                <div key={i} className="text-xs text-red-400/80 flex items-start gap-1">
                  <span className="shrink-0">-</span>
                  <span>{con}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
