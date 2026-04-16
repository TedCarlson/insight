// path: apps/web/src/shared/server/workforce/buildWorkforceSurfacePayload.server.ts

import { buildDisplayName } from "./buildDisplayName";
import type { WorkforceSurfacePayload } from "@/shared/types/workforce/surfacePayload";
import type {
  WorkforceRow,
  WorkforceScheduleDay,
  WorkforceSeatType,
} from "@/shared/types/workforce/workforce.types";

export type WorkforceSourceRow = {
  person_id: string;
  tech_id?: string | null;

  first_name?: string | null;
  preferred_name?: string | null;
  last_name?: string | null;

  office?: string | null;
  reports_to_name?: string | null;

  mobile?: string | null;
  nt_login?: string | null;
  csg?: string | null;

  position_title?: string | null;
  affiliation?: string | null;

  start_date?: string | null;
  end_date?: string | null;

  is_active?: boolean | null;
  is_travel_tech?: boolean | null;

  is_field?: boolean | null;
  is_leadership?: boolean | null;
  is_incomplete?: boolean | null;

  schedule?: WorkforceScheduleDay[] | null;
};

function normalizeSchedule(
  value: WorkforceSourceRow["schedule"]
): WorkforceScheduleDay[] {
  const fallback: WorkforceScheduleDay[] = [
    { day: "U", state: "UNKNOWN" },
    { day: "M", state: "UNKNOWN" },
    { day: "T", state: "UNKNOWN" },
    { day: "W", state: "UNKNOWN" },
    { day: "H", state: "UNKNOWN" },
    { day: "F", state: "UNKNOWN" },
    { day: "S", state: "UNKNOWN" },
  ];

  if (!Array.isArray(value) || value.length === 0) return fallback;

  const byDay = new Map<string, WorkforceScheduleDay>();
  for (const item of value) {
    if (!item?.day) continue;
    byDay.set(item.day, item);
  }

  return fallback.map((base) => byDay.get(base.day) ?? base);
}

function classifySeatType(row: WorkforceSourceRow): WorkforceSeatType {
  if (row.is_travel_tech) return "TRAVEL";
  if (row.is_field) return "FIELD";
  if (row.is_leadership) return "LEADERSHIP";
  return "INCOMPLETE";
}

function toWorkforceRow(row: WorkforceSourceRow): WorkforceRow {
  return {
    person_id: String(row.person_id ?? "").trim(),
    tech_id: row.tech_id ? String(row.tech_id).trim() : null,

    first_name: row.first_name ? String(row.first_name).trim() : null,
    preferred_name: row.preferred_name
      ? String(row.preferred_name).trim()
      : null,
    last_name: row.last_name ? String(row.last_name).trim() : null,

    display_name: buildDisplayName({
      preferred_name: row.preferred_name ?? null,
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
    }),

    office: row.office ? String(row.office).trim() : null,
    reports_to_name: row.reports_to_name
      ? String(row.reports_to_name).trim()
      : null,

    schedule: normalizeSchedule(row.schedule ?? null),

    seat_type: classifySeatType(row),

    mobile: row.mobile ? String(row.mobile).trim() : null,
    nt_login: row.nt_login ? String(row.nt_login).trim() : null,
    csg: row.csg ? String(row.csg).trim() : null,

    position_title: row.position_title
      ? String(row.position_title).trim()
      : null,
    affiliation: row.affiliation ? String(row.affiliation).trim() : null,

    start_date: row.start_date ? String(row.start_date).trim() : null,
    end_date: row.end_date ? String(row.end_date).trim() : null,

    is_active: row.is_active !== false,
    is_travel_tech: row.is_travel_tech === true,
    is_incomplete: row.is_incomplete === true,
  };
}

function buildTabs(rows: WorkforceRow[]): WorkforceSurfacePayload["tabs"] {
  const total = rows.length;
  const field = rows.filter((row) => row.seat_type === "FIELD").length;
  const leadership = rows.filter(
    (row) => row.seat_type === "LEADERSHIP"
  ).length;
  const incomplete = rows.filter(
    (row) => row.seat_type === "INCOMPLETE"
  ).length;
  const travel = rows.filter((row) => row.seat_type === "TRAVEL").length;

  return [
    { key: "ALL", label: "All", count: total },
    { key: "FIELD", label: "Field", count: field },
    { key: "LEADERSHIP", label: "Leadership", count: leadership },
    { key: "INCOMPLETE", label: "Incomplete", count: incomplete },
    { key: "TRAVEL", label: "Travel Techs", count: travel },
  ];
}

export function buildWorkforceSurfacePayload(args: {
  rows: WorkforceSourceRow[];
}): WorkforceSurfacePayload {
  const rows = (args.rows ?? []).map(toWorkforceRow);

  return {
    rows,
    tabs: buildTabs(rows),
    summary: {
      total: rows.length,
      field: rows.filter((row) => row.seat_type === "FIELD").length,
      leadership: rows.filter((row) => row.seat_type === "LEADERSHIP").length,
      incomplete: rows.filter((row) => row.seat_type === "INCOMPLETE").length,
      travel: rows.filter((row) => row.seat_type === "TRAVEL").length,
    },
  };
}