// apps/web/src/app/locate/LocateDailyCallLogClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";


type Frame = "AM" | "PM";

type StateResource = {
  state_code: string;
  state_name: string;
  default_manpower: number;
  backlog_seed: number;
  is_active?: boolean;
};

type TicketInputs = {
  manpower_count: number | "";
  tickets_received_am: number | "";
  tickets_closed_pm: number | "";
  project_tickets: number | "";
  emergency_tickets: number | "";
};

type GridRow = {
  state_name: string;
  state_code: string;
  inputs: TicketInputs;
};

type DailyRowFromApi = {
  log_date: string; // YYYY-MM-DD
  state_code: string;
  state_name: string;

  manpower_count: number;
  tickets_received_am: number;
  tickets_closed_pm: number;
  project_tickets: number;
  emergency_tickets: number;

  backlog_start: number;
  backlog_end: number;

  avg_received_per_tech: number;
  avg_closed_per_tech: number;

  updated_at?: string;
};

function todayISODateLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function detectFrameLocal(): Frame {
  const h = new Date().getHours();
  return h < 12 ? "AM" : "PM";
}

function toNum(v: number | ""): number {
  return v === "" ? 0 : Number(v);
}

function safeAvg(totalTickets: number, manpower: number): number {
  if (!manpower || manpower <= 0) return 0;
  return Math.round((totalTickets / manpower) * 100) / 100;
}

const TARGET_TICKETS_PER_TECH = 20; // your planning target
const SLA_OK_THRESHOLD_PCT = 95; // green if >= 95%

function estimatedSlaPctAM(ticketsReceivedAM: number, manpower: number): number | null {
  if (!manpower || manpower <= 0) return null;
  if (!ticketsReceivedAM || ticketsReceivedAM <= 0) return null;

  const capacity = manpower * TARGET_TICKETS_PER_TECH;
  const pct = (capacity / ticketsReceivedAM) * 100;

  // cap at 100 so it reads like “coverage”
  const capped = Math.min(100, pct);
  return Math.round(capped);
}

function slaPillStyle(pct: number) {
  const ok = pct >= SLA_OK_THRESHOLD_PCT;

  // green for ok, orange for risk
  return ok
    ? { bg: "rgba(16,185,129,0.14)", fg: "rgb(16,185,129)" }
    : { bg: "rgba(249,115,22,0.14)", fg: "rgb(249,115,22)" };
}

function paceFlag(avg: number): "NONE" | "LOW" | "OK" | "HIGH" {
  if (!Number.isFinite(avg) || avg <= 0) return "NONE";
  if (avg < 15) return "LOW";
  if (avg > 25) return "HIGH";
  return "OK";
}

// Utilization = working today / baseline total
function utilizationPct(workingToday: number, baselineTotal: number): number {
  if (!baselineTotal || baselineTotal <= 0) return 0;
  return Math.max(0, Math.round((workingToday / baselineTotal) * 100));
}

// SLA proxy = closed / received
function closurePct(received: number, closed: number): number {
  if (!received || received <= 0) return 0;
  return Math.max(0, Math.round((closed / received) * 100));
}

function makeInputs(_defaultManpower: number): TicketInputs {
  // Working (manpower_count) is DAILY entry and should start blank.
  // Baseline manpower is shown in its own column from the seed table.
  return {
    manpower_count: "",
    tickets_received_am: "",
    tickets_closed_pm: "",
    project_tickets: "",
    emergency_tickets: "",
  };
}

function selectAllOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  // Highlight everything for quick overwrite
  e.currentTarget.select();
}

function keepSelectionOnMouseUp(e: React.MouseEvent<HTMLInputElement>) {
  // Prevent mouseup from clearing the selection
  e.preventDefault();
}

export default function LocateDailyCallLogClient() {
  const [logDate, setLogDate] = useState<string>(() => todayISODateLocal());
  const [frame, setFrame] = useState<Frame>(() => detectFrameLocal());
  const [filter, setFilter] = useState<string>("");

  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyOnlySaved, setHistoryOnlySaved] = useState<boolean>(true);
  const [historyOnlyFlagged, setHistoryOnlyFlagged] = useState<boolean>(false);

  const [rows, setRows] = useState<GridRow[]>([]);
  const [serverRows, setServerRows] = useState<Record<string, DailyRowFromApi>>({});
  const [stateByCode, setStateByCode] = useState<Record<string, StateResource>>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [out, setOut] = useState<string>("");

  // Baseline editor modal
  const [editing, setEditing] = useState<null | { state_code: string; state_name: string; default_manpower: number; backlog_seed: number }>(null);
  const [savingBaseline, setSavingBaseline] = useState(false);

    const historyRows = useMemo(() => {
    const all = Object.values(serverRows).sort((a, b) => a.state_name.localeCompare(b.state_name));
    const q = historyFilter.trim().toLowerCase();

    function hasAnyMeaningfulData(r: DailyRowFromApi) {
      return (
        (r.manpower_count ?? 0) > 0 ||
        (r.tickets_received_am ?? 0) > 0 ||
        (r.tickets_closed_pm ?? 0) > 0 ||
        (r.project_tickets ?? 0) > 0 ||
        (r.emergency_tickets ?? 0) > 0
      );
    }

    function isFlagged(r: DailyRowFromApi) {
      const working = Number(r.manpower_count ?? 0);
      const total = frame === "AM" ? Number(r.tickets_received_am ?? 0) : Number(r.tickets_closed_pm ?? 0);
      const avg = safeAvg(total, working);
      const canFormat = working > 0 && total > 0;
      if (!canFormat) return false;
      const pace = paceFlag(avg);
      return pace === "LOW" || pace === "HIGH";
    }

    return all.filter((r) => {
      if (historyOnlySaved && !hasAnyMeaningfulData(r)) return false;
      if (historyOnlyFlagged && !isFlagged(r)) return false;

      if (!q) return true;
      return r.state_name.toLowerCase().includes(q) || r.state_code.toLowerCase().includes(q);
    });
  }, [serverRows, historyFilter, historyOnlySaved, historyOnlyFlagged, frame]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.state_name.toLowerCase().includes(q) || r.state_code.toLowerCase().includes(q));
  }, [rows, filter]);

  function updateRow(state_code: string, patch: Partial<TicketInputs>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.state_code !== state_code) return r;
        return { ...r, inputs: { ...r.inputs, ...patch } };
      })
    );
  }

  function currentTotal(inputs: TicketInputs): number {
    return frame === "AM" ? toNum(inputs.tickets_received_am) : toNum(inputs.tickets_closed_pm);
  }

  function getBacklogStart(state_code: string): number {
    return serverRows[state_code]?.backlog_start ?? 0;
  }

  function projectedBacklogEnd(state_code: string, inputs: TicketInputs): number {
    const start = getBacklogStart(state_code);
    const received =
      frame === "AM" ? toNum(inputs.tickets_received_am) : serverRows[state_code]?.tickets_received_am ?? 0;
    const closed = frame === "PM" ? toNum(inputs.tickets_closed_pm) : serverRows[state_code]?.tickets_closed_pm ?? 0;
    return start + received - closed;
  }

  function validate(): string[] {
    const errs: string[] = [];
    for (const r of rows) {
      const any =
        r.inputs.manpower_count !== "" ||
        r.inputs.tickets_received_am !== "" ||
        r.inputs.tickets_closed_pm !== "" ||
        r.inputs.project_tickets !== "" ||
        r.inputs.emergency_tickets !== "";

      if (!any) continue;

      const manpower = toNum(r.inputs.manpower_count);
      const total = currentTotal(r.inputs);
      const proj = toNum(r.inputs.project_tickets);
      const emer = toNum(r.inputs.emergency_tickets);

      if (manpower < 0) errs.push(`${r.state_name}: manpower cannot be negative`);
      if (total < 0) errs.push(`${r.state_name}: ticket total cannot be negative`);
      if (proj < 0) errs.push(`${r.state_name}: project tickets cannot be negative`);
      if (emer < 0) errs.push(`${r.state_name}: emergency tickets cannot be negative`);

      // IMPORTANT: B) independent counts — no proj+emer<=total constraint
    }
    return errs;
  }

  async function loadStatesAndDay(date: string) {
    setLoading(true);
    setOut("");
    try {
      const st = await fetch("/api/locate/state-resource", { cache: "no-store" });

      let stJson: any = null;
      try {
        stJson = await st.json();
      } catch {
        const txt = await st.text().catch(() => "");
        setOut(`state-resource returned non-JSON (${st.status}). ${txt.slice(0, 200)}`);
        return;
      }

      if (!st.ok || !stJson?.ok) {
        setOut(`Failed to load states: ${stJson?.error ?? st.status}`);
        return;
      }

      const s: StateResource[] = Array.isArray(stJson.states) ? (stJson.states as StateResource[]) : [];

      const sMap: Record<string, StateResource> = {};
      for (const x of s) sMap[String(x.state_code).toUpperCase()] = x;
      setStateByCode(sMap);

      const dl = await fetch(`/api/locate/daily-log?date=${encodeURIComponent(date)}`, { cache: "no-store" });

      let dlJson: any = null;
      try {
        dlJson = await dl.json();
      } catch {
        const txt = await dl.text().catch(() => "");
        setOut(`daily-log returned non-JSON (${dl.status}). ${txt.slice(0, 200)}`);
        return;
      }

      const map: Record<string, DailyRowFromApi> = {};
      if (dl.ok && dlJson?.ok) {
        for (const r of (dlJson.rows ?? []) as DailyRowFromApi[]) {
          map[String(r.state_code).toUpperCase()] = r;
        }
      }
      setServerRows(map);

      const grid: GridRow[] = s.map((x) => {
        const code = String(x.state_code).toUpperCase();
        const existing = map[code];

        const inputs = makeInputs(Number(x.default_manpower ?? 0));

        if (existing) {
        // If saved manpower is 0, treat it as "unset" for UX (show blank).
        const savedManpower = Number(existing.manpower_count ?? 0);
        inputs.manpower_count = savedManpower > 0 ? savedManpower : "";

        if (frame === "AM") {
          const v = Number(existing.tickets_received_am ?? 0);
          inputs.tickets_received_am = v > 0 ? v : "";
        }

        if (frame === "PM") {
          const v = Number(existing.tickets_closed_pm ?? 0);
          inputs.tickets_closed_pm = v > 0 ? v : "";
        }

        const proj = Number(existing.project_tickets ?? 0);
        inputs.project_tickets = proj > 0 ? proj : "";

        const emer = Number(existing.emergency_tickets ?? 0);
        inputs.emergency_tickets = emer > 0 ? emer : "";
      }

        return { state_name: x.state_name, state_code: code, inputs };
      });

      setRows(grid);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatesAndDay(logDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadStatesAndDay(logDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logDate, frame]);

  async function onSubmitBatch() {
    setOut("");

    const errs = validate();
    if (errs.length) {
      setOut(errs.join("\n"));
      return;
    }

    const payloadRows = rows
      .map((r) => {
        const any =
          r.inputs.manpower_count !== "" ||
          r.inputs.tickets_received_am !== "" ||
          r.inputs.tickets_closed_pm !== "" ||
          r.inputs.project_tickets !== "" ||
          r.inputs.emergency_tickets !== "";

        if (!any) return null;

        return {
          state_code: r.state_code,
          manpower_count: toNum(r.inputs.manpower_count),
          tickets_total: frame === "AM" ? toNum(r.inputs.tickets_received_am) : toNum(r.inputs.tickets_closed_pm),
          project_tickets: toNum(r.inputs.project_tickets),
          emergency_tickets: toNum(r.inputs.emergency_tickets),
        };
      })
      .filter(Boolean) as Array<{
      state_code: string;
      manpower_count: number;
      tickets_total: number;
      project_tickets: number;
      emergency_tickets: number;
    }>;

    if (!payloadRows.length) {
      setOut("Nothing to submit yet. Enter at least one state row.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/locate/daily-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ log_date: logDate, frame, rows: payloadRows }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setOut(`Submit failed: ${json?.error ?? res.status}`);
        return;
      }

      setOut(`Submitted ${payloadRows.length} row(s).`);
      await loadStatesAndDay(logDate);
    } finally {
      setSubmitting(false);
    }
  }

  function openBaselineModalFor(state_code: string, state_name: string) {
    const sr = stateByCode[state_code];
    setEditing({
      state_code,
      state_name,
      default_manpower: sr?.default_manpower ?? 0,
      backlog_seed: sr?.backlog_seed ?? 0,
    });
  }

  async function saveBaseline() {
    if (!editing) return;
    setSavingBaseline(true);
    try {
      const res = await fetch("/api/locate/state-resource/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state_code: editing.state_code,
          default_manpower: editing.default_manpower,
          backlog_seed: editing.backlog_seed,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setOut(`Baseline update failed: ${json?.error ?? res.status}`);
        return;
      }

      setEditing(null);
      await loadStatesAndDay(logDate);
    } finally {
      setSavingBaseline(false);
    }
  }

  const ticketsLabel = frame === "AM" ? "Tickets received (AM)" : "Tickets closed (PM)";

  // Tight first column + new Baseline/Util/SLA columns
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns:
        // State | Baseline | Working | Tickets | Project | Emergency | Backlog start | Backlog | Avg | Util | SLA
        "140px 110px 140px 140px 140px 140px 120px 120px 110px 90px 90px",
    }),
    []
  );

  

  return (
    <div className="grid gap-4">
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
              <div>Baseline</div>
              <div>Working</div>
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
              ) : filteredRows.length === 0 ? (
                <DataTableRow gridStyle={gridStyle}>
                  <div className="text-xs text-[var(--to-ink-muted)]" style={{ gridColumn: "1 / -1" }}>
                    No matching states.
                  </div>
                </DataTableRow>
              ) : (
                filteredRows.map((r) => {
                  const baseline = stateByCode[r.state_code]?.default_manpower ?? 0;

                  const total = frame === "AM" ? toNum(r.inputs.tickets_received_am) : toNum(r.inputs.tickets_closed_pm);
                  const working = toNum(r.inputs.manpower_count);

                  const avg = safeAvg(total, working);
                  const pace = paceFlag(avg);

                  const util = utilizationPct(working, baseline);

                  const ticketsReceivedAM =
                    serverRows[r.state_code]?.tickets_received_am ??
                    toNum(r.inputs.tickets_received_am);

                  // Estimated SLA is only meaningful on AM rows (lead measure)
                  const estSla = frame === "AM" ? estimatedSlaPctAM(ticketsReceivedAM, working) : null;

                  const backlogStart = getBacklogStart(r.state_code);
                  const backlogEnd = projectedBacklogEnd(r.state_code, r.inputs);


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
                              background: "rgba(16,185,129,0.07)", // lighter green wash
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
                          // Only format when BOTH are present (prevents “pretty nulls”)
                          const canFormat = working > 0 && total > 0;
                          const flag = canFormat ? paceFlag(avg) : "NONE";

                          if (!canFormat || flag === "NONE") {
                            return <span className="text-sm tabular-nums text-[var(--to-ink-muted)]">—</span>;
                          }

                          const pill =
                            flag === "OK"
                              ? { bg: "rgba(16,185,129,0.14)", fg: "rgb(16,185,129)", label: `${avg}` }
                              : flag === "LOW"
                                ? { bg: "rgba(249,115,22,0.14)", fg: "rgb(249,115,22)", label: `(!) ${avg}` }
                                : { bg: "rgba(239,68,68,0.14)", fg: "rgb(239,68,68)", label: `(!) ${avg}` };

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
                            title={
                              frame === "AM"
                                ? `Estimated SLA (lead): capacity ${working * TARGET_TICKETS_PER_TECH} ÷ demand ${ticketsReceivedAM}`
                                : `SLA (PM): pending definition`
                            }
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

          {out && <pre className="to-pre">{out}</pre>}
        </div>
      </Card>

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

          <label className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs"
            style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
          >
            <input
              type="checkbox"
              checked={historyOnlySaved}
              onChange={(e) => setHistoryOnlySaved(e.target.checked)}
            />
            Only saved
          </label>

          <label className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs"
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

                    // Utilization against baseline
                    const util = utilizationPct(working, baseline);

                    // Avg/tech depends on the current frame selection
                    const total = frame === "AM" ? receivedAM : closedPM;
                    const avg = safeAvg(total, working);
                    const canFormatAvg = working > 0 && total > 0;
                    const pace = canFormatAvg ? paceFlag(avg) : "NONE";

                    // Estimated SLA (AM lead measure) only
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

                        {/* Avg/tech pill (same styling as top table) */}
                        <div className="flex items-center">
                          {(() => {
                            if (!canFormatAvg || pace === "NONE") {
                              return <span className="text-sm tabular-nums text-[var(--to-ink-muted)]">—</span>;
                            }

                            const pill =
                              pace === "OK"
                                ? { bg: "rgba(16,185,129,0.14)", fg: "rgb(16,185,129)", label: `${avg}` }
                                : pace === "LOW"
                                  ? { bg: "rgba(249,115,22,0.14)", fg: "rgb(249,115,22)", label: `(!) ${avg}` }
                                  : { bg: "rgba(239,68,68,0.14)", fg: "rgb(239,68,68)", label: `(!) ${avg}` };

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

                        {/* AM Estimated SLA (same pill style) */}
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

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div
            className="w-full max-w-lg rounded-xl border bg-[var(--to-surface)] p-4 shadow-xl"
            style={{ borderColor: "var(--to-border)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Edit baselines</div>
                <div className="text-sm text-[var(--to-ink-muted)]">
                  {editing.state_name} ({editing.state_code})
                </div>
              </div>

              <button
                type="button"
                className="rounded border px-2 py-1 text-sm hover:bg-[var(--to-surface-2)]"
                style={{ borderColor: "var(--to-border)" }}
                onClick={() => setEditing(null)}
                disabled={savingBaseline}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-[var(--to-ink-muted)]">Total manpower (baseline)</span>
                <input
                  inputMode="numeric"
                  className="to-input h-10"
                  value={editing.default_manpower}
                  onChange={(e) => setEditing({ ...editing, default_manpower: Number(e.target.value || 0) })}
                  disabled={savingBaseline}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--to-ink-muted)]">Backlog seed</span>
                <input
                  inputMode="numeric"
                  className="to-input h-10"
                  value={editing.backlog_seed}
                  onChange={(e) => setEditing({ ...editing, backlog_seed: Number(e.target.value || 0) })}
                  disabled={savingBaseline}
                />
              </label>

              <div className="mt-2 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(null)} disabled={savingBaseline}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={saveBaseline} disabled={savingBaseline}>
                  {savingBaseline ? "Saving…" : "Save baselines"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}