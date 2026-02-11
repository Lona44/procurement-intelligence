"use client";

import { useAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { agentAtomFamily } from "@/store/atoms";
import { AGENT_CONFIG, EASE } from "@/lib/constants";
import type { AgentType } from "@/types";
import ProgressBar from "./ProgressBar";
import RecommendationList from "./RecommendationList";

interface AgentCardProps {
  agentType: AgentType;
}

export default function AgentCard({ agentType }: AgentCardProps) {
  const [state] = useAtom(agentAtomFamily(agentType));
  const config = AGENT_CONFIG[agentType];

  return (
    <div className="card p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-zinc-900">{config.label}</h3>
          <p className="text-sm text-zinc-500">{config.tagline}</p>
        </div>
        <div className="ml-auto shrink-0">
          {state.status === "idle" && (
            <span className="text-sm text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200">
              Pending
            </span>
          )}
          {state.status === "thinking" && (
            <span
              className="text-sm px-2.5 py-1 rounded-full border"
              style={{
                color: config.color,
                backgroundColor: `${config.color}10`,
                borderColor: `${config.color}25`,
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse"
                style={{ backgroundColor: config.color }}
              />
              Analyzing
            </span>
          )}
          {state.status === "complete" && (
            <span className="text-sm text-emerald-600 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              Complete
            </span>
          )}
          {state.status === "error" && (
            <span className="text-sm text-red-600 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
              Error
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
        <div className="space-y-1.5 mb-4">
          <AnimatePresence initial={false}>
            {state.steps.map((step, i) => {
              const isCurrent = i === state.steps.length - 1 && state.status === "thinking";
              return (
                <motion.div
                  key={step}
                  className="text-sm flex items-center gap-2"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {isCurrent ? (
                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                      style={{ borderColor: `${config.color}60`, borderTopColor: "transparent" }}
                    />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5 shrink-0 text-zinc-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <span className={isCurrent ? "text-zinc-700" : "text-zinc-500"}>{step}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Results */}
      {state.status === "complete" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <div
            className="rounded-lg px-4 py-3 mb-4 border"
            style={{
              backgroundColor: `${config.color}08`,
              borderColor: `${config.color}20`,
            }}
          >
            <div className="text-xl font-semibold" style={{ color: config.color }}>
              ${state.total_savings.toLocaleString()}
            </div>
            <div className="text-sm text-zinc-500 mt-0.5">Total potential savings</div>
          </div>

          {state.summary && (
            <p className="text-sm text-zinc-500 mb-4 leading-relaxed">{state.summary}</p>
          )}

          <RecommendationList recommendations={state.recommendations} agentType={agentType} />
        </motion.div>
      )}
    </div>
  );
}
