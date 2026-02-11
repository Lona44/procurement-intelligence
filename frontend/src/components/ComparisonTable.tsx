"use client";

import { useMemo } from "react";
import { useAtom } from "jotai";
import { agentAtomFamily } from "@/store/atoms";
import { AGENT_CONFIG } from "@/lib/constants";
import type { AgentType } from "@/types";

const agents = (Object.keys(AGENT_CONFIG) as AgentType[]).map((type) => ({
  type,
  label: AGENT_CONFIG[type].label,
  color: AGENT_CONFIG[type].color,
}));

export default function ComparisonTable() {
  const [conservative] = useAtom(agentAtomFamily("conservative"));
  const [aggressive] = useAtom(agentAtomFamily("aggressive"));
  const [balanced] = useAtom(agentAtomFamily("balanced"));

  const states = useMemo(
    () => ({ conservative, aggressive, balanced }),
    [conservative, aggressive, balanced]
  );

  const allComplete = Object.values(states).every((s) => s.status === "complete");

  const rows = useMemo(() => {
    if (!allComplete) return [];
    return [
      {
        label: "Total Savings",
        values: agents.map((a) => `$${states[a.type].total_savings.toLocaleString()}`),
        bold: true,
      },
      {
        label: "Recommendations",
        values: agents.map((a) => String(states[a.type].recommendations.length)),
      },
      {
        label: "Avg Confidence",
        values: agents.map((a) => {
          const recs = states[a.type].recommendations;
          const avg =
            recs.length > 0 ? recs.reduce((sum, r) => sum + r.confidence, 0) / recs.length : 0;
          return `${Math.round(avg * 100)}%`;
        }),
      },
      {
        label: "Top Recommendation",
        values: agents.map((a) => states[a.type].recommendations[0]?.title || "\u2014"),
        small: true,
      },
    ];
  }, [states, allComplete]);

  if (!allComplete) return null;

  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-zinc-800 mb-4">Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left text-sm text-zinc-500 font-medium py-2.5 pr-4 uppercase tracking-wider">
                Metric
              </th>
              {agents.map((a) => (
                <th key={a.type} className="text-center py-2.5 px-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: a.color }}
                    />
                    <span className="text-sm font-medium text-zinc-700">{a.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i < rows.length - 1 ? "border-b border-zinc-100" : ""}>
                <td className="py-2.5 pr-4 text-sm text-zinc-500">{row.label}</td>
                {row.values.map((val, j) => (
                  <td
                    key={j}
                    className={`text-center py-2.5 px-3 ${
                      row.bold ? "font-semibold text-zinc-900" : ""
                    } ${row.small ? "text-sm text-zinc-500" : "text-base text-zinc-700"}`}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
