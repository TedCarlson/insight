"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";

import type { DailyRowFromApi, Frame, GridRow, StateResource, TicketInputs } from "../types";
import {
  estimatedSlaPctAM,
  paceFlag,
  safeAvg,
  slaPillStyle,
  TARGET_TICKETS_PER_TECH,
  toNum,
  utilizationPct,
} from "../lib/math";

type Props = {
  loading: boolean;
  submitting: boolean;

  logDate: string;
  setLogDate: (v: string) => void;

  frame: Frame;
  setFrame: (v: Frame) => void;

  filter: string;
  setFilter: (v: string) => void;

  ticketsLabel: string;
  gridStyle: React.CSSProperties;

  rows: GridRow[]; // already filtered upstream
  serverRows: Record<string, DailyRowFromApi>;
  stateByCode: Record<string, StateResource>;

  updateRow: (state_code: string, patch: Partial<TicketInputs>) => void;
  openBaselineModalFor: (state_code: string, state_name: string) => void;
  projectedBacklogEnd: (state_code: string, inputs: TicketInputs) => number;
  getBacklogStart: (state_code: string) => number;

  onSubmitBatch: () => void;
  out: string;
};

export function LocateDailyEntryTable(props: Props) {
  const {
    loading,
    submitting,
    logDate,
    setLogDate,
    frame,
    setFrame,
    filter,
    setFilter,
    ticketsLabel,
    gridStyle,
    rows,
    serverRows,
    stateByCode,
    updateRow,
    openBaselineModalFor,
    projectedBacklogEnd,
    getBacklogStart,
    onSubmitBatch,
    out,
  } = props;

  return (
    <Card>
      <div className="grid gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-1">
            <div className="text-sm font-medium">Daily call log</div>
            <div className="text-sm text-[var(--to-ink-muted)]">
              Batch entry by State. Manpower is daily; baseline comes from the state seed table.
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-[var(--to-ink-muted)]">Date</span>
              <input
                type="date"
                className="to-input h-10 w-[170px]"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                disabled={loading || submitting}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-[var(--to-ink-muted)]">Frame</span>
              <select
                className="to-select h-10 w-[200px]"
                value={frame}
                onChange={(e) => setFrame(e.target.value as Frame)}
                disabled={loading || submitting}
              >
                <option value="AM">AM (tickets received)</option>
                <option value="PM">PM (tickets closed)</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs text-[var(--to-ink-muted)]">Filter</span>
              <input
                className="to-input h-10 w-[220px]"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="State or code…"
                disabled={loading || submitting}
              />
            </label>

            <Button variant="primary" onClick={onSubmitBatch} disabled={loading || submitting}>
              {submitting ? "Submitting…" : "Submit Daily Log"}
            </Button>
          </div>
        </div>

        <DataTable zebra hover layout="content" gridStyle={gridStyle}>
          <DataTableHeader gridStyle={gridStyle}>
            <div>State</div>
            <div>Headcount</div>
            <div>Working</div>
            <div>OJC</div>
            <div>{ticketsLabel}</div>
            <div>Project</div>
            <div>Emergency</div>
            <div>Backlog start</div>
            <div>{frame === "AM" ? "Backlog (proj)" : "Backlog end"}</div>
            <div>Avg / tech</div>
            <div>Util %</div>
            <div>SLA %</div>
          </DataTableHeader>

          <DataTableBody zebra>
            {loading ? (
              <DataTableRow gridStyle={gridStyle}>
                <div className="text-xs text-[var(--to-ink-muted)]" style={{ gridColumn: "1 / -1" }}>
                  Loading…
                </div>
              </DataTableRow>
            ) : rows.length === 0 ? (
              <DataTableRow gridStyle={gridStyle}>
                <div className="text-xs text-[var(--to-ink-muted)]" style={{ gridColumn: "1 / -1" }}>
                  No matching states.
                </div>
              </DataTableRow>
            ) : (
              rows.map((r) => {
                const baseline = stateByCode[r.state_code]?.default_manpower ?? 0;

                const total = frame === "AM" ? toNum(r.inputs.tickets_received_am) : toNum(r.inputs.tickets_closed_pm);
                const working = toNum(r.inputs.manpower_count);

                const avg = safeAvg(total, working);
                const util = utilizationPct(working, baseline);

                const ticketsReceivedAM =
                  serverRows[r.state_code]?.tickets_received_am ?? toNum(r.inputs.tickets_received_am);

                const estSla = frame === "AM" ? estimatedSlaPctAM(ticketsReceivedAM, working) : null;

                const backlogStart = getBacklogStart(r.state_code);
                const backlogEnd = projectedBacklogEnd(r.state_code, r.inputs);

                const ojcVal = (r.inputs as any).ojc ?? "";

                return (
                  <DataTableRow key={r.state_code} gridStyle={gridStyle}>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{r.state_code}</span>
                      <span className="text-xs text-[var(--to-ink-muted)]">{r.state_name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular-nums text-[var(--to-ink-muted)]">{baseline}</span>

                      <button
                        type="button"
                        className="inline-flex items-center rounded-full px-1.5 py-0.25 text-[11px] font-medium leading-2"
                        style={{
                          border: "1px solid rgba(16,185,129,0.28)",
                          background: "rgba(16,185,129,0.07)",
                          color: "rgb(16,185,129)",
                        }}
                        onClick={() => openBaselineModalFor(r.state_code, r.state_name)}
                        disabled={submitting}
                        title="Edit baseline manpower + backlog seed"
                      >
                        Edit
                      </button>
                    </div>

                    <div>
                      <input
                        inputMode="numeric"
                        className="to-input h-9 w-[130px] text-sm"
                        value={r.inputs.manpower_count === 0 ? "" : r.inputs.manpower_count}
                        onChange={(e) =>
                          updateRow(r.state_code, {
                            manpower_count: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        disabled={submitting}
                      />
                    </div>

                    {/* OJC (On Job Count) */}
                    <div>
                      <input
                        inputMode="numeric"
                        className="to-input h-9 w-[110px] text-sm"
                        value={ojcVal === 0 ? "" : ojcVal}
                        onChange={(e) =>
                          updateRow(r.state_code, {
                            ojc: e.target.value === "" ? "" : Number(e.target.value),
                          } as any)
                        }
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      {frame === "AM" ? (
                        <input
                          inputMode="numeric"
                          className="to-input h-9 w-[130px] text-sm"
                          value={r.inputs.tickets_received_am}
                          onChange={(e) =>
                            updateRow(r.state_code, {
                              tickets_received_am: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          disabled={submitting}
                        />
                      ) : (
                        <input
                          inputMode="numeric"
                          className="to-input h-9 w-[130px] text-sm"
                          value={r.inputs.tickets_closed_pm}
                          onChange={(e) =>
                            updateRow(r.state_code, {
                              tickets_closed_pm: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          disabled={submitting}
                        />
                      )}
                    </div>

                    <div>
                      <input
                        inputMode="numeric"
                        className="to-input h-9 w-[130px] text-sm"
                        value={r.inputs.project_tickets}
                        onChange={(e) =>
                          updateRow(r.state_code, {
                            project_tickets: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <input
                        inputMode="numeric"
                        className="to-input h-9 w-[130px] text-sm"
                        value={r.inputs.emergency_tickets}
                        onChange={(e) =>
                          updateRow(r.state_code, {
                            emergency_tickets: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        disabled={submitting}
                      />
                    </div>

                    <div className="text-sm tabular-nums">{backlogStart}</div>
                    <div className="text-sm tabular-nums">{backlogEnd}</div>

                    <div className="flex items-center">
                      {(() => {
                        const canFormat = working > 0 && total > 0;
                        const flag = canFormat ? paceFlag(avg) : "NONE";

                        if (!canFormat || flag === "NONE") {
                          return <span className="text-sm tabular-nums text-[var(--to-ink-muted)]">—</span>;
                        }

                        const pill =
                          flag === "OK"
                            ? { bg: "rgba(16,185,129,0.14)", fg: "rgb(16,185,129)", label: `${avg}` }
                            : flag === "LOW"
                              ? { bg: "rgba(234,179,8,0.12)", fg: "rgb(234,179,8)", label: `(-) ${avg}` }
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
                        (() => {
                          const style = slaPillStyle(estSla);
                          return (
                            <span
                              className="rounded-full px-2 py-1 text-xs font-medium"
                              style={{
                                border: "1px solid var(--to-border)",
                                background: style.bg,
                                color: style.fg,
                              }}
                              title={`Estimated SLA (lead): capacity ${
                                working * TARGET_TICKETS_PER_TECH
                              } ÷ demand ${ticketsReceivedAM}`}
                            >
                              {estSla}%
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>

        {out && <pre className="to-pre">{out}</pre>}
      </div>
    </Card>
  );
}