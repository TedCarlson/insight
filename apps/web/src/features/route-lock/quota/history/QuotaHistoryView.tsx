"use client";

import React from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

import type { MonthItem, QuotaRow } from "../hooks/useQuotaAdminData";
import { sumRowHours, toInt, type DayKey } from "../lib/quotaMath";

type DisplayMode = "hours" | "units" | "techs";

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: "qh_sun", label: "Sun" },
  { key: "qh_mon", label: "Mon" },
  { key: "qh_tue", label: "Tue" },
  { key: "qh_wed", label: "Wed" },
  { key: "qh_thu", label: "Thu" },
  { key: "qh_fri", label: "Fri" },
  { key: "qh_sat", label: "Sat" },
];

function hoursToUnits(hours: number) {
  return hours * 12;
}
function hoursToTechs(hours: number) {
  return Math.ceil(hours / 8);
}
function displayValue(mode: DisplayMode, hours: number) {
  if (mode === "hours") return hours;
  if (mode === "units") return hoursToUnits(hours);
  return hoursToTechs(hours);
}

function fiscalShortFromLabel(label: string) {
  const m = String(label ?? "")
    .trim()
    .match(/^FY(\d{4})\s+([A-Za-z]+)/);
  if (!m) return String(label ?? "").trim() || "—";
  const yy = m[1].slice(-2);
  const mon = m[2].slice(0, 3);
  return `FY${yy} ${mon}`;
}
function fiscalShortFromRow(r: Pick<QuotaRow, "fiscal_month_label">) {
  return fiscalShortFromLabel(r.fiscal_month_label);
}

type Props = {
  status: {
    loading: boolean;
    saving: boolean;
    err: string | null;
    notice: string | null;
  };

  months: MonthItem[];

  mode: DisplayMode;
  setMode: (v: DisplayMode) => void;

  history: {
    historyMonthId: string;
    setHistoryMonthId: (v: string) => void;
    historyQuery: string;
    setHistoryQuery: (v: string) => void;
    filteredHistoryRows: QuotaRow[];
    onRefreshHistory: () => void;
  };
};

export function QuotaHistoryView(props: Props) {
  const { status, months, mode, setMode, history } = props;
  const { loading, saving, err, notice } = status;

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <Card>
        <div className="flex items-center gap-3">
          <Link href="/route-lock/quota">
            <Button variant="secondary">Back</Button>
          </Link>

          <div>
            <div className="text-sm font-semibold">Quota History</div>
            <div className="text-xs text-[var(--to-ink-muted)]">All quota rows (inline table)</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={history.onRefreshHistory}
              disabled={loading || saving}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {err ? (
        <Card className="mt-3">
          <div className="text-sm font-semibold text-[var(--to-status-danger)]">Quota error</div>
          <div className="text-sm text-[var(--to-ink-muted)]">{err}</div>
        </Card>
      ) : null}

      {notice ? (
        <Card className="mt-3">
          <div className="text-sm font-semibold">Success</div>
          <div className="text-sm text-[var(--to-ink-muted)]">{notice}</div>
        </Card>
      ) : null}

      <Card className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">History</div>

          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as DisplayMode)}
            size="sm"
            options={[
              { value: "hours", label: "Hours" },
              { value: "units", label: "Units" },
              { value: "techs", label: "Techs" },
            ]}
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              value={history.historyMonthId}
              onChange={(e) => history.setHistoryMonthId(e.target.value)}
              className="w-48"
              disabled={months.length === 0}
            >
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m.fiscal_month_id} value={m.fiscal_month_id}>
                  {fiscalShortFromLabel(m.label)}
                </option>
              ))}
            </Select>

            <TextInput
              value={history.historyQuery}
              onChange={(e) => history.setHistoryQuery(e.target.value)}
              placeholder="Search (route or month)..."
              className="w-56"
            />
          </div>
        </div>

        <div className="mt-3 overflow-auto rounded border border-[var(--to-border)]">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr>
                <th className="text-left p-2 w-32">Fiscal month</th>
                <th className="text-left p-2 w-56">Route</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="text-right p-2">
                    {d.label}
                  </th>
                ))}
                <th className="text-right p-2">Weekly</th>
              </tr>
            </thead>
            <tbody>
              {history.filteredHistoryRows.length === 0 ? (
                <tr key="quota-history-empty" className="border-t border-[var(--to-border)]">
                  <td colSpan={10} className="p-3 text-[var(--to-ink-muted)]">
                    No quota rows yet.
                  </td>
                </tr>
              ) : (
                history.filteredHistoryRows.map((r, i) => (
                  <tr key={`${r.quota_id}-${i}`} className="border-t border-[var(--to-border)]">
                    <td className="p-2 text-xs whitespace-nowrap">{fiscalShortFromRow(r)}</td>
                    <td className="p-2 text-xs">{r.route_name}</td>

                    {DAYS.map((d) => (
                      <td key={d.key} className="p-2 text-xs text-right">
                        {displayValue(mode, toInt((r as Record<DayKey, unknown>)[d.key]))}
                      </td>
                    ))}

                    <td className="p-2 text-xs text-right font-medium">
                      {displayValue(mode, sumRowHours(r as any))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
          Techs are derived as <b>ceil(hours / 8)</b> per day.
        </div>
      </Card>
    </div>
  );
}