"use client";

import { useState, useMemo, useCallback } from "react";
import type { SuggestedMapping } from "@/types";

const TARGET_FIELDS = ["date", "vendor", "category", "amount", "department"] as const;

const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  vendor: "Vendor",
  category: "Category",
  amount: "Amount",
  department: "Department",
};

// Same keywords as backend — used for live confidence scoring
const FIELD_KEYWORDS: Record<string, string[]> = {
  date: [
    "date",
    "publish",
    "created",
    "signed",
    "start_date",
    "contract_date",
    "period",
    "invoice_date",
    "effective",
    "timestamp",
  ],
  vendor: [
    "vendor",
    "supplier",
    "provider",
    "company",
    "contractor",
    "seller",
    "merchant",
    "payee",
    "partner",
  ],
  category: [
    "category",
    "unspsc",
    "classification",
    "type",
    "class",
    "sector",
    "segment",
    "product",
    "service",
  ],
  amount: [
    "amount",
    "value",
    "cost",
    "spend",
    "price",
    "total",
    "sum",
    "payment",
    "fee",
    "budget",
    "contract_value",
  ],
  department: [
    "department",
    "agency",
    "division",
    "org",
    "business_unit",
    "unit",
    "team",
    "branch",
    "office",
    "entity",
  ],
};

function scoreColumn(field: string, column: string): number {
  const col = column.trim().toLowerCase();
  const keywords = FIELD_KEYWORDS[field] ?? [];
  let best = 0;
  for (const kw of keywords) {
    if (col === kw) best = Math.max(best, 1.0);
    else if (kw.includes(col) || col.includes(kw)) best = Math.max(best, 0.8);
    else if (kw.split("_").some((part) => col.includes(part))) best = Math.max(best, 0.6);
  }
  return best;
}

interface Props {
  columns: string[];
  suggestedMappings: SuggestedMapping[];
  onConfirm: (mappings: Record<string, string>) => void;
  loading?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8
      ? "bg-emerald-100 text-emerald-700"
      : confidence >= 0.6
        ? "bg-amber-100 text-amber-700"
        : "bg-zinc-100 text-zinc-500";

  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {Math.round(confidence * 100)}%
    </span>
  );
}

export default function ColumnMapping({ columns, suggestedMappings, onConfirm, loading }: Props) {
  const suggestedMap = useMemo(() => {
    const m: Record<string, { source: string; confidence: number }> = {};
    for (const s of suggestedMappings) {
      m[s.target_field] = { source: s.source_column, confidence: s.confidence };
    }
    return m;
  }, [suggestedMappings]);

  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of TARGET_FIELDS) {
      initial[field] = suggestedMap[field]?.source ?? "";
    }
    return initial;
  });

  const handleChange = useCallback((field: string, value: string) => {
    setMappings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const allMapped = TARGET_FIELDS.every((f) => mappings[f] !== "");

  const selectedSources = Object.values(mappings).filter(Boolean);
  const hasDuplicates = new Set(selectedSources).size !== selectedSources.length;

  const isValid = allMapped && !hasDuplicates;

  return (
    <div className="card p-6">
      <h3 className="text-base font-medium text-zinc-800 mb-1">Column Mapping</h3>
      <p className="text-sm text-zinc-500 mb-5">
        Map your file columns to the required fields. Auto-suggestions are pre-selected.
      </p>

      <div className="space-y-3">
        {TARGET_FIELDS.map((field) => {
          const value = mappings[field];
          const isDuplicate = value !== "" && selectedSources.filter((s) => s === value).length > 1;
          const confidence = value ? scoreColumn(field, value) : 0;

          return (
            <div key={field} className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-700 w-28 shrink-0">
                {FIELD_LABELS[field]}
              </span>

              <select
                value={value}
                onChange={(e) => handleChange(field, e.target.value)}
                className={`flex-1 text-sm rounded-lg border px-3 py-2 bg-white transition-colors ${
                  isDuplicate
                    ? "border-red-300 ring-1 ring-red-200"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <option value="">— Select column —</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              <span className="w-14 shrink-0 text-right">
                {isDuplicate ? (
                  <span className="text-xs text-red-500">Duplicate</span>
                ) : value && confidence > 0 ? (
                  <ConfidenceBadge confidence={confidence} />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      {hasDuplicates && (
        <p className="text-xs text-red-500 mt-3">
          Each source column can only be mapped to one field.
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => isValid && onConfirm(mappings)}
          disabled={!isValid || loading}
          className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all px-5 py-2 rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/25 disabled:shadow-none"
        >
          {loading ? "Confirming..." : "Confirm Mappings"}
        </button>
      </div>
    </div>
  );
}
