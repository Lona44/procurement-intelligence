"use client";

import type { AgentType, Recommendation } from "@/types";
import VotePanel from "./VotePanel";

interface RecommendationListProps {
  recommendations: Recommendation[];
  agentType: AgentType;
}

const riskStyles = {
  low: "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  high: "text-red-600 bg-red-50 border-red-200",
};

export default function RecommendationList({
  recommendations,
  agentType,
}: RecommendationListProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-2.5 mt-3">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="rounded-lg p-3.5 border border-zinc-200 bg-zinc-50/60 shadow-[0_1px_2px_0_rgb(0_0_0/0.02)]"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-medium text-zinc-800 leading-snug">{rec.title}</h4>
            <span
              className={`text-xs uppercase tracking-wider font-medium px-2 py-0.5 rounded border shrink-0 ${riskStyles[rec.risk_level]}`}
            >
              {rec.risk_level}
            </span>
          </div>

          <p className="text-sm text-zinc-500 mb-3 leading-relaxed">{rec.description}</p>

          <div className="flex items-center gap-4 text-sm mb-3">
            <div>
              <span className="text-zinc-500">Savings </span>
              <span className="font-medium text-zinc-800">
                ${rec.estimated_savings.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Confidence </span>
              <span className="font-medium text-zinc-800">{Math.round(rec.confidence * 100)}%</span>
            </div>
            <div className="ml-auto">
              <VotePanel agentType={agentType} recommendation={rec} />
            </div>
          </div>

          {(rec.pros.length > 0 || rec.cons.length > 0) && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2.5 border-t border-zinc-200">
              <div className="space-y-1">
                {rec.pros.map((pro, i) => (
                  <div key={i} className="text-xs text-zinc-500 flex items-start gap-1.5">
                    <span className="text-emerald-500 shrink-0 mt-px">+</span>
                    <span>{pro}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {rec.cons.map((con, i) => (
                  <div key={i} className="text-xs text-zinc-500 flex items-start gap-1.5">
                    <span className="text-red-400 shrink-0 mt-px">&minus;</span>
                    <span>{con}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
