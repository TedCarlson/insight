import { useMemo, useState } from "react";
import type { DailyRowFromApi, Frame, GridRow, StateResource, TicketInputs } from "../types";
import { detectFrameLocal, todayISODateLocal } from "@/features/locate/daily-log/lib/date";
import { paceFlag, safeAvg, toNum } from "@/features/locate/daily-log/lib/math";

function makeInputs(_defaultManpower: number): TicketInputs {
  return {
    manpower_count: "",
    tickets_received_am: "",
    tickets_closed_pm: "",
    project_tickets: "",
    emergency_tickets: "",
  };
}

export function useLocateDailyLogState(args: {
  serverRows: Record<string, DailyRowFromApi>;
  stateByCode: Record<string, StateResource>;
  frameExternal?: Frame; // optional if you ever want data hook to own it
}) {
  const [logDate, setLogDate] = useState<string>(() => todayISODateLocal());
  const [frame, setFrame] = useState<Frame>(() => detectFrameLocal());
  const [filter, setFilter] = useState<string>("");

  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyOnlySaved, setHistoryOnlySaved] = useState<boolean>(true);
  const [historyOnlyFlagged, setHistoryOnlyFlagged] = useState<boolean>(false);

  const [rows, setRows] = useState<GridRow[]>([]);
  const [editing, setEditing] = useState<
    null | { state_code: string; state_name: string; default_manpower: number; backlog_seed: number }
  >(null);

  const ticketsLabel = frame === "AM" ? "Tickets received (AM)" : "Tickets closed (PM)";
  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: "140px 110px 140px 140px 140px 140px 120px 120px 110px 90px 90px" }),
    []
  );

  function updateRow(state_code: string, patch: Partial<TicketInputs>) {
    setRows((prev) => prev.map((r) => (r.state_code !== state_code ? r : { ...r, inputs: { ...r.inputs, ...patch } })));
  }

  function currentTotal(inputs: TicketInputs): number {
    return frame === "AM" ? toNum(inputs.tickets_received_am) : toNum(inputs.tickets_closed_pm);
  }

  function getBacklogStart(state_code: string): number {
    return args.serverRows[state_code]?.backlog_start ?? 0;
  }

  function projectedBacklogEnd(state_code: string, inputs: TicketInputs): number {
    const start = getBacklogStart(state_code);
    const received = frame === "AM" ? toNum(inputs.tickets_received_am) : args.serverRows[state_code]?.tickets_received_am ?? 0;
    const closed = frame === "PM" ? toNum(inputs.tickets_closed_pm) : args.serverRows[state_code]?.tickets_closed_pm ?? 0;
    return start + received - closed;
  }

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.state_name.toLowerCase().includes(q) || r.state_code.toLowerCase().includes(q));
  }, [rows, filter]);

  const historyRows = useMemo(() => {
    const all = Object.values(args.serverRows).sort((a, b) => a.state_name.localeCompare(b.state_name));
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
  }, [args.serverRows, historyFilter, historyOnlySaved, historyOnlyFlagged, frame]);

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
    }
    return errs;
  }

  function buildPayloadRows() {
    return rows
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
  }

  function openBaselineModalFor(state_code: string, state_name: string) {
    const sr = args.stateByCode[state_code];
    setEditing({
      state_code,
      state_name,
      default_manpower: sr?.default_manpower ?? 0,
      backlog_seed: sr?.backlog_seed ?? 0,
    });
  }

  return {
    // core state
    logDate,
    setLogDate,
    frame,
    setFrame,
    filter,
    setFilter,

    historyFilter,
    setHistoryFilter,
    historyOnlySaved,
    setHistoryOnlySaved,
    historyOnlyFlagged,
    setHistoryOnlyFlagged,

    rows,
    setRows,
    filteredRows,
    historyRows,

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
    makeInputs, // exported for orchestrator load-to-grid
  };
}