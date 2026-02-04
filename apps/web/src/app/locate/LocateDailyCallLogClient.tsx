"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Frame = "AM" | "PM";

type StateResource = {
  state_code: string;
  state_name: string;
  default_manpower: number;
  backlog_seed: number;
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

function paceFlag(avg: number): "LOW" | "OK" | "HIGH" {
  if (avg < 15) return "LOW";
  if (avg > 25) return "HIGH";
  return "OK";
}

function makeInputs(defaultManpower: number): TicketInputs {
  return {
    manpower_count: Number.isFinite(defaultManpower) ? defaultManpower : "",
    tickets_received_am: "",
    tickets_closed_pm: "",
    project_tickets: "",
    emergency_tickets: "",
  };
}

export default function LocateDailyCallLogClient() {
  const [logDate, setLogDate] = useState<string>(() => todayISODateLocal());
  const [frame, setFrame] = useState<Frame>(() => detectFrameLocal());

  const [filter, setFilter] = useState<string>("");

  const [states, setStates] = useState<StateResource[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [serverRows, setServerRows] = useState<Record<string, DailyRowFromApi>>({}); // keyed by state_code

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [out, setOut] = useState<string>("");

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.state_name.toLowerCase().includes(q) || r.state_code.toLowerCase().includes(q)
    );
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
    const received = frame === "AM" ? toNum(inputs.tickets_received_am) : serverRows[state_code]?.tickets_received_am ?? 0;
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

      if (proj + emer > total) {
        errs.push(`${r.state_name}: project + emergency cannot exceed total (${proj + emer} > ${total})`);
      }
    }
    return errs;
  }

  async function loadStatesAndDay(date: string) {
    setLoading(true);
    setOut("");
    try {
      const st = await fetch("/api/locate/state-resource", { cache: "no-store" });
      const stJson = await st.json();

      if (!st.ok || !stJson?.ok) {
        setOut(`Failed to load states: ${stJson?.error ?? st.status}`);
        return;
      }

      const s: StateResource[] = (stJson.states ?? []) as StateResource[];
      setStates(s);

      // Load today’s saved data (if any)
      const dl = await fetch(`/api/locate/daily-log?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const dlJson = await dl.json();

      const map: Record<string, DailyRowFromApi> = {};
      if (dl.ok && dlJson?.ok) {
        for (const r of (dlJson.rows ?? []) as DailyRowFromApi[]) {
          map[String(r.state_code).toUpperCase()] = r;
        }
      }
      setServerRows(map);

      // Build grid rows (prefill manpower from state resource; prefill totals from server for current frame)
      const grid: GridRow[] = s.map((x) => {
        const code = String(x.state_code).toUpperCase();
        const existing = map[code];

        const inputs = makeInputs(Number(x.default_manpower ?? 0));

        if (existing) {
          inputs.manpower_count = existing.manpower_count ?? inputs.manpower_count;

          // prefill based on selected frame
          if (frame === "AM") inputs.tickets_received_am = existing.tickets_received_am ?? "";
          if (frame === "PM") inputs.tickets_closed_pm = existing.tickets_closed_pm ?? "";

          inputs.project_tickets = existing.project_tickets ?? "";
          inputs.emergency_tickets = existing.emergency_tickets ?? "";
        }

        return {
          state_name: x.state_name,
          state_code: code,
          inputs,
        };
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

  // If user changes date or frame, reload day and prefills
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
          tickets_total: currentTotal(r.inputs),
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

      // Reload day so computed backlog/averages update
      await loadStatesAndDay(logDate);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* Top card: batch entry */}
      <Card>
        <div className="grid gap-3">
          <div className="to-locate-toolbar">
            <div className="to-locate-toolbar__left">
              <div className="to-locate-toolbar__title">Daily call log</div>
              <div className="to-locate-toolbar__subtitle">
                Batch entry by State. Frame auto-detects but you can override.
              </div>
            </div>

            <div className="to-locate-controls">
              <label className="grid gap-1">
                <span className="text-xs text-[var(--to-ink-muted)]">Date</span>
                <input
                  type="date"
                  className="to-input"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  disabled={loading || submitting}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--to-ink-muted)]">Frame</span>
                <select
                  className="to-select"
                  value={frame}
                  onChange={(e) => setFrame(e.target.value as Frame)}
                  disabled={loading || submitting}
                >
                  <option value="AM">AM (tickets received)</option>
                  <option value="PM">PM (tickets closed)</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--to-ink-muted)]">Filter states</span>
                <input
                  className="to-input"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Type state or code…"
                  disabled={loading || submitting}
                />
              </label>

              <Button variant="primary" onClick={onSubmitBatch} disabled={loading || submitting}>
                {submitting ? "Submitting…" : "Submit batch"}
              </Button>
            </div>
          </div>

          <div className="to-locate-tablewrap">
            <table className="to-locate-table">
              <thead>
                <tr className="text-left">
                  <th className="to-locate-th">State</th>
                  <th className="to-locate-th">Manpower</th>
                  <th className="to-locate-th">{frame === "AM" ? "Tickets received (AM)" : "Tickets closed (PM)"}</th>
                  <th className="to-locate-th">Project</th>
                  <th className="to-locate-th">Emergency</th>
                  <th className="to-locate-th">Backlog start</th>
                  <th className="to-locate-th">{frame === "AM" ? "Backlog (proj)" : "Backlog end"}</th>
                  <th className="to-locate-th">Avg tickets / tech</th>
                  <th className="to-locate-th">Pace</th>
                  <th className="to-locate-th">Key</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="to-locate-tr">
                    <td className="to-locate-td" colSpan={10}>
                      Loading…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr className="to-locate-tr">
                    <td className="to-locate-td" colSpan={10}>
                      No matching states.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const total = currentTotal(r.inputs);
                    const manpower = toNum(r.inputs.manpower_count);
                    const avg = safeAvg(total, manpower);
                    const flag = paceFlag(avg);

                    const key = `${logDate}|${frame}|${r.state_code}`;

                    const backlogStart = getBacklogStart(r.state_code);
                    const backlogEnd = projectedBacklogEnd(r.state_code, r.inputs);

                    return (
                      <tr key={r.state_code} className="to-locate-tr">
                        <td className="to-locate-td">
                          <span className="to-locate-rowstate">
                            {r.state_name} <span className="to-locate-code">({r.state_code})</span>
                          </span>
                        </td>

                        <td className="to-locate-td">
                          <input
                            inputMode="numeric"
                            className="to-locate-num to-locate-num--sm"
                            value={r.inputs.manpower_count}
                            onChange={(e) =>
                              updateRow(r.state_code, {
                                manpower_count: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            disabled={submitting}
                          />
                        </td>

                        <td className="to-locate-td">
                          {frame === "AM" ? (
                            <input
                              inputMode="numeric"
                              className="to-locate-num to-locate-num--md"
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
                              className="to-locate-num to-locate-num--md"
                              value={r.inputs.tickets_closed_pm}
                              onChange={(e) =>
                                updateRow(r.state_code, {
                                  tickets_closed_pm: e.target.value === "" ? "" : Number(e.target.value),
                                })
                              }
                              disabled={submitting}
                            />
                          )}
                        </td>

                        <td className="to-locate-td">
                          <input
                            inputMode="numeric"
                            className="to-locate-num to-locate-num--sm"
                            value={r.inputs.project_tickets}
                            onChange={(e) =>
                              updateRow(r.state_code, {
                                project_tickets: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            disabled={submitting}
                          />
                        </td>

                        <td className="to-locate-td">
                          <input
                            inputMode="numeric"
                            className="to-locate-num to-locate-num--sm"
                            value={r.inputs.emergency_tickets}
                            onChange={(e) =>
                              updateRow(r.state_code, {
                                emergency_tickets: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            disabled={submitting}
                          />
                        </td>

                        <td className="to-locate-td">
                          <span className="to-locate-chip">{backlogStart}</span>
                        </td>

                        <td className="to-locate-td">
                          <span className="to-locate-chip">{backlogEnd}</span>
                        </td>

                        <td className="to-locate-td">
                          <span className="to-locate-chip">{avg}</span>
                        </td>

                        <td className="to-locate-td">
                          <span className="to-locate-chip">{flag}</span>
                        </td>

                        <td className="to-locate-td">
                          <code className="to-locate-code">{key}</code>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {out && (
            <pre className="to-pre">
              {out}
            </pre>
          )}
        </div>
      </Card>

      {/* Bottom card: submitted rows (DB-backed snapshot for selected day) */}
      <Card>
        <div className="grid gap-2">
          <div className="text-sm font-medium">Saved logs for {logDate}</div>
          <div className="text-sm text-[var(--to-ink-muted)]">
            This is DB-backed. Next step: edit-in-place + filters by state/frame/date ranges.
          </div>

          <div className="to-locate-tablewrap">
            <table className="to-locate-table--submitted">
              <thead>
                <tr className="text-left">
                  <th className="to-locate-th">State</th>
                  <th className="to-locate-th">Manpower</th>
                  <th className="to-locate-th">Received (AM)</th>
                  <th className="to-locate-th">Closed (PM)</th>
                  <th className="to-locate-th">Project</th>
                  <th className="to-locate-th">Emergency</th>
                  <th className="to-locate-th">Backlog start</th>
                  <th className="to-locate-th">Backlog end</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(serverRows).length === 0 ? (
                  <tr className="to-locate-tr">
                    <td className="to-locate-td" colSpan={8}>
                      No saved rows for this date yet.
                    </td>
                  </tr>
                ) : (
                  Object.values(serverRows).map((s) => (
                    <tr key={s.state_code} className="to-locate-tr">
                      <td className="to-locate-td">
                        <span className="to-locate-rowstate">
                          {s.state_name} <span className="to-locate-code">({s.state_code})</span>
                        </span>
                      </td>
                      <td className="to-locate-td">{s.manpower_count}</td>
                      <td className="to-locate-td">{s.tickets_received_am}</td>
                      <td className="to-locate-td">{s.tickets_closed_pm}</td>
                      <td className="to-locate-td">{s.project_tickets}</td>
                      <td className="to-locate-td">{s.emergency_tickets}</td>
                      <td className="to-locate-td">{s.backlog_start}</td>
                      <td className="to-locate-td">{s.backlog_end}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}