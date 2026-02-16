"use client";

import type { ColumnStats } from "@/types";

interface Props {
  stats: ColumnStats[];
  rowCount: number;
}

function TypeBadge({ dtype }: { dtype: string }) {
  const colors: Record<string, string> = {
    string: "bg-blue-100 text-blue-700",
    numeric: "bg-violet-100 text-violet-700",
    date: "bg-emerald-100 text-emerald-700",
    boolean: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded ${colors[dtype] ?? "bg-zinc-100 text-zinc-500"}`}
    >
      {dtype}
    </span>
  );
}

function MissingPct({ pct }: { pct: number }) {
  const color = pct > 20 ? "text-red-600" : pct > 5 ? "text-amber-600" : "text-emerald-600";
  return <span className={`text-sm font-medium ${color}`}>{pct.toFixed(1)}%</span>;
}

export default function DataQualityTable({ stats, rowCount }: Props) {
  const totalColumns = stats.length;
  const totalMissing = stats.reduce((sum, s) => sum + s.missing_count, 0);
  const totalCells = stats.reduce((sum, s) => sum + s.total_count, 0);
  const completeness =
    totalCells > 0 ? ((1 - totalMissing / totalCells) * 100).toFixed(1) : "100.0";
  const rowsWithMissing = new Set(stats.filter((s) => s.missing_count > 0).map((s) => s.name)).size;

  return (
    <div className="card p-6">
      <h3 className="text-base font-medium text-zinc-800 mb-4">Data Quality</h3>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Columns" value={totalColumns.toString()} />
        <KpiCard label="Total Rows" value={rowCount.toLocaleString()} />
        <KpiCard label="Completeness" value={`${completeness}%`} />
        <KpiCard label="Cols w/ Missing" value={rowsWithMissing.toString()} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left text-zinc-500 text-xs uppercase tracking-wider">
              <th className="px-3 py-2 font-medium">Column</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium text-right">Non-Null</th>
              <th className="px-3 py-2 font-medium text-right">Missing %</th>
              <th className="px-3 py-2 font-medium text-right">Unique</th>
              <th className="px-3 py-2 font-medium">Sample Values</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {stats.map((s) => (
              <tr key={s.name} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-3 py-2 font-medium text-zinc-800 whitespace-nowrap">{s.name}</td>
                <td className="px-3 py-2">
                  <TypeBadge dtype={s.dtype} />
                </td>
                <td className="px-3 py-2 text-right text-zinc-600">
                  {(s.total_count - s.missing_count).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <MissingPct pct={s.missing_pct} />
                </td>
                <td className="px-3 py-2 text-right text-zinc-600">
                  {s.unique_count.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-zinc-500 max-w-[250px] truncate">
                  {s.sample_values.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-800">{value}</p>
    </div>
  );
}
