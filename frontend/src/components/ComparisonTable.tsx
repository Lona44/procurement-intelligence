"use client";

import { useAtom } from "jotai";
import { agentAtomFamily } from "@/store/atoms";
import type { AgentType } from "@/types";

const agents: { type: AgentType; label: string; color: string }[] = [
  { type: "conservative", label: "Conservative", color: "#22c55e" },
  { type: "aggressive", label: "Aggressive", color: "#ef4444" },
  { type: "balanced", label: "Balanced", color: "#3b82f6" },
];

export default function ComparisonTable() {
  const [conservative] = useAtom(agentAtomFamily("conservative"));
  const [aggressive] = useAtom(agentAtomFamily("aggressive"));
  const [balanced] = useAtom(agentAtomFamily("balanced"));

  const states = { conservative, aggressive, balanced };
  const allComplete = Object.values(states).every((s) => s.status === "complete");

  if (!allComplete) return null;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mt-6">
      <h3 className="text-lg font-bold text-zinc-100 mb-4">
        Side-by-Side Comparison
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-500 py-2 pr-4 font-medium">
                Metric
              </th>
              {agents.map((a) => (
                <th
                  key={a.type}
                  className="text-center py-2 px-3 font-semibold"
                  style={{ color: a.color }}
                >
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            <tr className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 text-zinc-500">Total Savings</td>
              {agents.map((a) => (
                <td key={a.type} className="text-center py-2 px-3 font-semibold">
                  ${states[a.type].total_savings.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 text-zinc-500"># Recommendations</td>
              {agents.map((a) => (
                <td key={a.type} className="text-center py-2 px-3">
                  {states[a.type].recommendations.length}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 text-zinc-500">Avg Confidence</td>
              {agents.map((a) => {
                const recs = states[a.type].recommendations;
                const avg =
                  recs.length > 0
                    ? recs.reduce((sum, r) => sum + r.confidence, 0) / recs.length
                    : 0;
                return (
                  <td key={a.type} className="text-center py-2 px-3">
                    {Math.round(avg * 100)}%
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-zinc-500">Top Recommendation</td>
              {agents.map((a) => {
                const top = states[a.type].recommendations[0];
                return (
                  <td
                    key={a.type}
                    className="text-center py-2 px-3 text-xs text-zinc-400"
                  >
                    {top?.title || "—"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
