"use client";

import { useAtom } from "jotai";
import { dataSummaryAtom } from "@/store/atoms";
import { AreaChart, DonutChart, BarChart, BarList } from "@tremor/react";
import { RiAlertLine } from "@remixicon/react";
import { formatCurrency } from "@/lib/utils";

interface BucketItem {
  total_spend: number;
  transaction_count: number;
}

function bucketList<T extends BucketItem>(items: T[], labelKey: string, max: number = 8) {
  if (items.length <= max) return items;
  const top = items.slice(0, max);
  const rest = items.slice(max);
  const otherSpend = rest.reduce((s, i) => s + i.total_spend, 0);
  const otherCount = rest.reduce((s, i) => s + i.transaction_count, 0);
  return [
    ...top,
    { [labelKey]: "Other", total_spend: otherSpend, transaction_count: otherCount } as unknown as T,
  ];
}

export default function DataOverview() {
  const [summary] = useAtom(dataSummaryAtom);

  if (!summary) return null;

  const vendorCount = summary.top_vendors.length;
  const categories = bucketList(summary.category_breakdown, "category");
  const departments = bucketList(summary.department_breakdown, "department");

  const donutData = categories.map((c) => ({
    name: c.category,
    value: c.total_spend,
  }));

  const barListData = summary.top_vendors.slice(0, 8).map((v) => ({
    name: v.vendor,
    value: v.total_spend,
  }));

  const monthlyData = summary.monthly_trends.map((t) => ({
    month: t.month,
    Spend: t.total_spend,
  }));

  const deptChartData = departments.map((d) => ({
    name: d.department,
    Spend: d.total_spend,
  }));

  return (
    <div className="space-y-4 mb-8">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Spend" value={formatCurrency(summary.total_spend)} />
        <KpiCard label="Transactions" value={summary.row_count.toLocaleString()} />
        <KpiCard label="Date Range" value={summary.date_range} small />
        <KpiCard label="Vendors" value={vendorCount.toString()} />
      </div>

      {/* Duplicate Vendor Warning */}
      {summary.duplicate_vendors.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
          <RiAlertLine className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Possible duplicate vendors detected
            </p>
            <ul className="mt-1 text-sm text-amber-700">
              {summary.duplicate_vendors.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Monthly Spend Trend */}
      {monthlyData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-medium text-zinc-600 mb-4">Monthly Spend Trend</h3>
          <AreaChart
            className="h-48"
            data={monthlyData}
            index="month"
            categories={["Spend"]}
            colors={["indigo"]}
            valueFormatter={formatCurrency}
            showAnimation={true}
            showLegend={false}
            showGridLines={false}
            curveType="monotone"
          />
        </div>
      )}

      {/* Category + Top Vendors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-base font-medium text-zinc-600 mb-4">Spend by Category</h3>
          <DonutChart
            className="h-48"
            data={donutData}
            category="value"
            index="name"
            valueFormatter={formatCurrency}
            showAnimation={true}
            colors={[
              "indigo",
              "violet",
              "fuchsia",
              "pink",
              "rose",
              "cyan",
              "teal",
              "emerald",
              "amber",
            ]}
          />
        </div>
        <div className="card p-5">
          <h3 className="text-base font-medium text-zinc-600 mb-4">Top Vendors</h3>
          <BarList
            data={barListData}
            valueFormatter={formatCurrency}
            showAnimation={true}
            color="indigo"
          />
        </div>
      </div>

      {/* Department Breakdown */}
      {deptChartData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-medium text-zinc-600 mb-4">Spend by Department</h3>
          <BarChart
            className="h-56"
            data={deptChartData}
            index="name"
            categories={["Spend"]}
            colors={["orange"]}
            valueFormatter={formatCurrency}
            showAnimation={true}
            showLegend={false}
            showGridLines={false}
          />
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className={`font-semibold text-zinc-900 ${small ? "text-sm" : "text-lg"}`}>{value}</p>
    </div>
  );
}
