import { useCallback, useMemo, useState } from "react";
import type { DailyRowFromApi, Frame, GridRow, StateResource, TicketInputs } from "../types";
import { detectFrameLocal, todayISODateLocal } from "@/features/locate/daily-log/lib/date";
import { toNum } from "@/features/locate/daily-log/lib/math";

function makeInputs(_defaultManpower: number): TicketInputs {
  return {
    manpower_count: "",
    tickets_received_am: "",
    tickets_closed_pm: "",
    project_tickets: "",
    emergency_tickets: "",
    ojc: "",
  };
}

function rowHasAnyInput(r: GridRow): boolean {
  return (
    r.inputs.manpower_count !== "" ||
    r.inputs.tickets_received_am !== "" ||
    r.inputs.tickets_closed_pm !== "" ||
    r.inputs.project_tickets !== "" ||
    r.inputs.emergency_tickets !== "" ||
    r.inputs.ojc !== ""
  );
}

export function useLocateDailyLogState(args: {
  serverRows: Record<string, DailyRowFromApi>;
  stateByCode: Record<string, StateResource>;
  frameExternal?: Frame;
}) {
  const [logDate, setLogDate] = useState<string>(() => todayISODateLocal());
  const [frame, setFrame] = useState<Frame>(() => detectFrameLocal());
  const [filter, setFilter] = useState<string>("");

  const [rows, setRows] = useState<GridRow[]>([]);
  const [editing, setEditing] = useState<
    null | { state_code: string; state_name: string; default_manpower: number; backlog_seed: number }
  >(null);

  // Dirty tracking
  const [dirtyByCode, setDirtyByCode] = useState<Record<string, boolean>>({});

  const markDirty = useCallback((state_code: string) => {
    const code = String(state_code).toUpperCase();
    setDirtyByCode((d) => (d[code] ? d : { ...d, [code]: true }));
  }, []);

  const resetDirty = useCallback(() => {
    setDirtyByCode({});
  }, []);

  const isDirtyAny = useCallback(() => {
    return Object.values(dirtyByCode).some(Boolean);
  }, [dirtyByCode]);

  const setDirtyFromRows = useCallback(
    (nextRows: GridRow[]) => {
      const next: Record<string, boolean> = {};
      for (const r of nextRows) {
        if (rowHasAnyInput(r)) next[String(r.state_code).toUpperCase()] = true;
      }
      setDirtyByCode(next);
    },
    [setDirtyByCode]
  );

  const filteredRows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter((r) => r.state_name.toLowerCase().includes(f) || r.state_code.toLowerCase().includes(f));
  }, [rows, filter]);

  const ticketsLabel = frame === "AM" ? "Received (AM)" : "Closed (PM)";
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: "140px 110px 140px 110px 140px 140px 140px 120px 120px 110px 90px 90px" }),
    []
  );

  const updateRow = useCallback(
    (state_code: string, patch: Partial<TicketInputs>) => {
      const code = String(state_code).toUpperCase();

      setRows((prev) =>
        prev.map((r) => {
          if (String(r.state_code).toUpperCase() !== code) return r;
          return { ...r, inputs: { ...r.inputs, ...patch } };
        })
      );

      markDirty(code);
    },
    [markDirty]
  );

  const currentTotal = useCallback(
    (r: GridRow): number => {
      return frame === "AM" ? toNum(r.inputs.tickets_received_am) : toNum(r.inputs.tickets_closed_pm);
    },
    [frame]
  );

  const validate = useCallback(() => {
    const errs: string[] = [];
    for (const r of rows) {
      if (!rowHasAnyInput(r)) continue;

      const manpower = toNum(r.inputs.manpower_count);
      const total = currentTotal(r);
      const proj = toNum(r.inputs.project_tickets);
      const emer = toNum(r.inputs.emergency_tickets);
      const ojc = toNum(r.inputs.ojc);

      if (manpower < 0) errs.push(`${r.state_name}: manpower cannot be negative`);
      if (total < 0) errs.push(`${r.state_name}: ${frame === "AM" ? "received" : "closed"} cannot be negative`);
      if (proj < 0) errs.push(`${r.state_name}: project tickets cannot be negative`);
      if (emer < 0) errs.push(`${r.state_name}: emergency tickets cannot be negative`);
      if (ojc < 0) errs.push(`${r.state_name}: OJC cannot be negative`);
    }
    return errs;
  }, [rows, currentTotal, frame]);

  const buildPayloadRows = useCallback(() => {
    return rows
      .map((r) => {
        if (!rowHasAnyInput(r)) return null;

        return {
          state_code: String(r.state_code).toUpperCase(),
          manpower_count: toNum(r.inputs.manpower_count),
          tickets_total: frame === "AM" ? toNum(r.inputs.tickets_received_am) : toNum(r.inputs.tickets_closed_pm),
          project_tickets: toNum(r.inputs.project_tickets),
          emergency_tickets: toNum(r.inputs.emergency_tickets),
          ojc: toNum(r.inputs.ojc),
        };
      })
      .filter(Boolean) as Array<{
      state_code: string;
      manpower_count: number;
      tickets_total: number;
      project_tickets: number;
      emergency_tickets: number;
      ojc: number;
    }>;
  }, [rows, frame]);

  const getBacklogStart = useCallback(
    (state_code: string, inputs: TicketInputs): number => {
      const code = String(state_code).toUpperCase();
      const existing = args.serverRows[code];
      const seed = args.stateByCode[code]?.backlog_seed ?? 0;

      // If there is an existing AM/PM entry, backlog_start comes from the view.
      if (existing) return Number(existing.backlog_start ?? 0);

      // Otherwise seed it.
      return Number(seed ?? 0);
    },
    [args.serverRows, args.stateByCode]
  );

  const projectedBacklogEnd = useCallback(
    (state_code: string, inputs: TicketInputs): number => {
      const code = String(state_code).toUpperCase();
      const start = getBacklogStart(code, inputs);

      const receivedAM = args.serverRows[code]?.tickets_received_am ?? toNum(inputs.tickets_received_am);
      const closedPM = args.serverRows[code]?.tickets_closed_pm ?? toNum(inputs.tickets_closed_pm);

      const proj = toNum(inputs.project_tickets);

      // AM: project backlog = start + received
      // PM: end backlog = start + received - closed
      if (frame === "AM") return start + receivedAM + proj;
      return start + receivedAM + proj - closedPM;
    },
    [args.serverRows, frame, getBacklogStart]
  );

  const openBaselineModalFor = useCallback(
    (state_code: string, state_name: string) => {
      const code = String(state_code).toUpperCase();
      const sr = args.stateByCode[code];
      setEditing({
        state_code: code,
        state_name,
        default_manpower: sr?.default_manpower ?? 0,
        backlog_seed: sr?.backlog_seed ?? 0,
      });
    },
    [args.stateByCode]
  );

  return {
    // core state
    logDate,
    setLogDate,
    frame,
    setFrame,
    filter,
    setFilter,

    rows,
    setRows,
    filteredRows,

    editing,
    setEditing,
    openBaselineModalFor,

    // helpers
    ticketsLabel,
    gridStyle,
    updateRow,
    validate,
    buildPayloadRows,
    getBacklogStart,
    projectedBacklogEnd,
    makeInputs,

    // dirty management
    dirtyByCode,
    isDirtyAny,
    resetDirty,
    setDirtyFromRows,
  };
}