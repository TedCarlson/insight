"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";

import type { DailyRowFromApi, Frame, StateResource } from "../types";
import {
  estimatedSlaPctAM,
  paceFlag,
  safeAvg,
  slaPillStyle,
  TARGET_TICKETS_PER_TECH,
  utilizationPct,
} from "../lib/math";

type Props = {
  logDate: string;

  frame: Frame;
  gridStyle: React.CSSProperties;

  historyRows: DailyRowFromApi[];
  stateByCode: Record<string, StateResource>;

  historyFilter: string;
  setHistoryFilter: (v: string) => void;

  historyOnlySaved: boolean;
  setHistoryOnlySaved: (v: boolean) => void;

  historyOnlyFlagged: boolean;
  setHistoryOnlyFlagged: (v: boolean) => void;
};

export function LocateDailyHistoryTable(props: Props) {
  const {
    logDate,
    frame,
    gridStyle,
    historyRows,
    stateByCode,
    historyFilter,
    setHistoryFilter,
    historyOnlySaved,
    setHistoryOnlySaved,
    historyOnlyFlagged,
    setHistoryOnlyFlagged,
  } = props;

  return (
    <Card>
      <div className="grid gap-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-1">
            <div className="text-sm font-medium">Saved logs for {logDate}</div>
            <div className="text-sm text-[var(--to-ink-muted)]">DB-backed snapshot for the selected day.</div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-[var(--to-ink-muted)]">Filter</span>
              <input
                className="to-input h-10 w-[220px]"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                placeholder="State or code…"
              />
            </label>

            <label
              className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs"
              style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
            >
              <input type="checkbox" checked={historyOnlySaved} onChange={(e) => setHistoryOnlySaved(e.target.checked)} />
              Only saved
            </label>

            <label
              className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs"
              style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
            >
              <input
                type="checkbox"
                checked={historyOnlyFlagged}
                onChange={(e) => setHistoryOnlyFlagged(e.target.checked)}
              />
              Only (!)
            </label>
          </div>
        </div>

        <DataTable zebra hover layout="content" gridStyle={gridStyle}>
          <DataTableHeader gridStyle={gridStyle}>
            <div>State</div>
            <div>Baseline</div>
            <div>Working</div>
            <div>Tickets received (AM)</div>
            <div>Tickets closed (PM)</div>
            <div>Project</div>
            <div>Emergency</div>
            <div>Backlog start</div>
            <div>Backlog end</div>
            <div>Avg / tech</div>
            <div>Util %</div>
            <div>{frame === "AM" ? "Est SLA %" : "SLA %"}</div>
          </DataTableHeader>

          <DataTableBody zebra>
            {historyRows.length === 0 ? (
              <DataTableRow gridStyle={gridStyle} className="py-1">
                <div className="text-xs text-[var(--to-ink-muted)]" style={{ gridColumn: "1 / -1" }}>
                  No saved rows for this date yet.
                </div>
              </DataTableRow>
            ) : (
              historyRows.map((s) => {
                const baseline = stateByCode[s.state_code]?.default_manpower ?? 0;

                const working = Number(s.manpower_count ?? 0);
                const receivedAM = Number(s.tickets_received_am ?? 0);
                const closedPM = Number(s.tickets_closed_pm ?? 0);

                const util = utilizationPct(working, baseline);

                const total = frame === "AM" ? receivedAM : closedPM;
                const avg = safeAvg(total, working);
                const canFormatAvg = working > 0 && total > 0;
                const pace = canFormatAvg ? paceFlag(avg) : "NONE";

                const estSla = frame === "AM" ? estimatedSlaPctAM(receivedAM, working) : null;

                return (
                  <DataTableRow key={s.state_code} gridStyle={gridStyle}>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{s.state_code}</span>
                      <span className="text-xs text-[var(--to-ink-muted)]">{s.state_name}</span>
                    </div>

                    <div className="text-sm tabular-nums text-[var(--to-ink-muted)]">{baseline}</div>
                    <div className="text-sm tabular-nums">{working || "—"}</div>
                    <div className="text-sm tabular-nums">{receivedAM || "—"}</div>
                    <div className="text-sm tabular-nums">{closedPM || "—"}</div>

                    <div className="text-sm tabular-nums">{Number(s.project_tickets ?? 0) || "—"}</div>
                    <div className="text-sm tabular-nums">{Number(s.emergency_tickets ?? 0) || "—"}</div>

                    <div className="text-sm tabular-nums">{Number(s.backlog_start ?? 0)}</div>
                    <div className="text-sm tabular-nums">{Number(s.backlog_end ?? 0)}</div>

                    <div className="flex items-center">
                      {(() => {
                        if (!canFormatAvg || pace === "NONE") {
                          return <span className="text-sm tabular-nums text-[var(--to-ink-muted)]">—</span>;
                        }

                        const pill =
                          pace === "OK"
                            ? { bg: "rgba(16,185,129,0.14)", fg: "rgb(16,185,129)", label: `${avg}` }
                            : pace === "LOW"
                              ? { bg: "rgba(249,115,22,0.14)", fg: "rgb(249,115,22)", label: `(-) ${avg}` }
                              : { bg: "rgba(239,68,68,0.14)", fg: "rgb(239,68,68)", label: `(+) ${avg}` };

                        return (
                          <span
                            className="rounded-full px-2 py-1 text-xs font-medium tabular-nums"
                            style={{
                              border: "1px solid var(--to-border)",
                              background: pill.bg,
                              color: pill.fg,
                            }}
                            title="Tickets per tech (pace)"
                          >
                            {pill.label}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="text-sm tabular-nums">{util}%</div>

                    <div className="flex items-center">
                      {estSla === null ? (
                        <span className="text-xs text-[var(--to-ink-muted)]">—</span>
                      ) : (
                        <span
                          className="rounded-full px-2 py-1 text-xs font-medium"
                          style={{
                            border: "1px solid var(--to-border)",
                            background: slaPillStyle(estSla).bg,
                            color: slaPillStyle(estSla).fg,
                          }}
                          title={`Estimated SLA (lead): capacity ${working * TARGET_TICKETS_PER_TECH} ÷ demand ${receivedAM}`}
                        >
                          {estSla}%
                        </span>
                      )}
                    </div>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </Card>
  );
}