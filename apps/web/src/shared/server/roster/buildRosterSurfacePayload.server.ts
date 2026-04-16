import { supabaseServer } from "@/shared/data/supabase/server";
import type {
  RosterFilters,
  RosterGroup,
  RosterGroupKey,
  RosterPerson,
  RosterRoleType,
  RosterSeatHistoryRow,
  RosterSeatRow,
  RosterSurfacePayload,
} from "@/shared/types/roster/surfacePayload";

type EnrichedRosterRow = {
  profile_fact_id: string | null;
  person_id: string | null;
  full_name: string | null;
  person_status: string | null;

  pc_org_id: string | null;
  position_title: string | null;
  role_type: string | null;
  is_field: boolean | null;
  is_leadership: boolean | null;
  allows_tech: boolean | null;

  tech_id: string | null;
  reports_to_person_id: string | null;
  reports_to_full_name: string | null;

  effective_start_date: string | null;
  effective_end_date: string | null;
  active_flag: boolean | null;
};

export type BuildRosterSurfacePayloadArgs = {
  pc_org_id: string;
  org_name?: string | null;
  as_of_date?: string | null;
  selected_person_id?: string | null;

  search?: string | null;
  reports_to_person_id?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  position_titles?: string[] | null;

  seat_types?: {
    field?: boolean;
    leadership?: boolean;
    incomplete?: boolean;
  };
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toRoleType(value: string | null | undefined): RosterRoleType {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "TECH") return "TECH";
  if (v === "SUPERVISOR") return "SUPERVISOR";
  if (v === "MANAGER") return "MANAGER";
  if (v === "DIRECTOR") return "DIRECTOR";
  if (v === "OWNER") return "OWNER";
  if (v === "LEAD") return "LEAD";
  return "OTHER";
}

function toBool(value: unknown) {
  return value === true;
}

function toMaybeString(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}

function overlapsAsOf(row: EnrichedRosterRow, asOfDate: string) {
  const start = toMaybeString(row.effective_start_date);
  const end = toMaybeString(row.effective_end_date);

  if (!start) return false;
  if (start > asOfDate) return false;
  if (end && end < asOfDate) return false;
  return true;
}

function isIncomplete(row: EnrichedRosterRow) {
  const positionTitle = toMaybeString(row.position_title);
  const roleType = toRoleType(row.role_type);
  const isField = toBool(row.is_field);
  const allowsTech = toBool(row.allows_tech);
  const techId = toMaybeString(row.tech_id);

  if (!positionTitle || positionTitle === "Unknown") return true;
  if (roleType === "OTHER" && positionTitle === "Unknown") return true;
  if ((isField || allowsTech || roleType === "TECH") && !techId) return true;

  return false;
}

function buildBadges(row: EnrichedRosterRow, incomplete: boolean) {
  const badges: string[] = [];

  if (toBool(row.is_field)) badges.push("Field");
  if (toBool(row.is_leadership)) badges.push("Leadership");
  if (toBool(row.allows_tech)) badges.push("Tech");
  if (incomplete) badges.push("Incomplete");
  if (toBool(row.active_flag)) badges.push("Active");

  return badges;
}

function buildSubtitle(row: EnrichedRosterRow) {
  const parts = [
    toMaybeString(row.position_title),
    toMaybeString(row.reports_to_full_name)
      ? `Reports to ${toMaybeString(row.reports_to_full_name)}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" • ") : null;
}

function toSeatRow(row: EnrichedRosterRow): RosterSeatRow | null {
  const seatId = toMaybeString(row.profile_fact_id);
  const personId = toMaybeString(row.person_id);
  const fullName = toMaybeString(row.full_name);
  const pcOrgId = toMaybeString(row.pc_org_id);
  const positionTitle = toMaybeString(row.position_title) ?? "Unknown";
  const effectiveStartDate = toMaybeString(row.effective_start_date);

  if (!seatId || !personId || !fullName || !pcOrgId || !effectiveStartDate) {
    return null;
  }

  const incomplete = isIncomplete(row);

  return {
    seat_id: seatId,
    person_id: personId,
    full_name: fullName,
    pc_org_id: pcOrgId,

    position_title: positionTitle,
    role_type: toRoleType(row.role_type),

    is_field: toBool(row.is_field),
    is_leadership: toBool(row.is_leadership),
    allows_tech: toBool(row.allows_tech),

    tech_id: toMaybeString(row.tech_id),

    reports_to_person_id: toMaybeString(row.reports_to_person_id),
    reports_to_name: toMaybeString(row.reports_to_full_name),

    effective_start_date: effectiveStartDate,
    effective_end_date: toMaybeString(row.effective_end_date),
    active_flag: toBool(row.active_flag),

    is_incomplete: incomplete,

    display: {
      subtitle: buildSubtitle(row),
      badges: buildBadges(row, incomplete),
    },
  };
}

function toHistoryRow(row: RosterSeatRow): RosterSeatHistoryRow {
  return {
    seat_id: row.seat_id,
    position_title: row.position_title,
    tech_id: row.tech_id,
    reports_to_person_id: row.reports_to_person_id,
    reports_to_name: row.reports_to_name,
    effective_start_date: row.effective_start_date,
    effective_end_date: row.effective_end_date,
    active_flag: row.active_flag,
  };
}

function resolveGroupKey(row: RosterSeatRow): RosterGroupKey {
  if (row.is_incomplete) return "INCOMPLETE";
  if (row.is_leadership) return "LEADERSHIP";
  return "FIELD";
}

function groupLabel(key: RosterGroupKey) {
  if (key === "FIELD") return "Field Seats";
  if (key === "LEADERSHIP") return "Leadership Seats";
  return "Incomplete Seats";
}

function sortSeatRows(rows: RosterSeatRow[]) {
  return [...rows].sort((a, b) => {
    if (a.full_name !== b.full_name) return a.full_name.localeCompare(b.full_name);
    if (a.position_title !== b.position_title) {
      return a.position_title.localeCompare(b.position_title);
    }
    return a.effective_start_date.localeCompare(b.effective_start_date);
  });
}

function buildGroups(rows: RosterSeatRow[]): RosterGroup[] {
  const grouped = new Map<RosterGroupKey, RosterSeatRow[]>();

  for (const row of rows) {
    const key = resolveGroupKey(row);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  const keys: RosterGroupKey[] = ["FIELD", "LEADERSHIP", "INCOMPLETE"];

  return keys.map((key) => {
    const groupRows = sortSeatRows(grouped.get(key) ?? []);
    return {
      key,
      label: groupLabel(key),
      count: groupRows.length,
      rows: groupRows,
    };
  });
}

function buildPersonSummary(rows: RosterSeatRow[]): RosterPerson | null {
  const first = rows[0];
  if (!first) return null;

  const activeRows = rows.filter((row) => row.active_flag);

  return {
    person_id: first.person_id,
    full_name: first.full_name,
    status: activeRows.length > 0 ? "active" : "inactive",
    active_seat_count: activeRows.length,
    has_field_seat: activeRows.some((row) => row.is_field),
    has_leadership_seat: activeRows.some((row) => row.is_leadership),
  };
}

function applyFilters(
  rows: RosterSeatRow[],
  filters: Pick<
    BuildRosterSurfacePayloadArgs,
    "search" | "reports_to_person_id" | "status" | "position_titles" | "seat_types"
  >
) {
  const search = String(filters.search ?? "").trim().toLowerCase();
  const reportsTo = toMaybeString(filters.reports_to_person_id);
  const status = filters.status ?? "ACTIVE";
  const allowedTitles = new Set(
    (filters.position_titles ?? []).map((v) => String(v).trim()).filter(Boolean)
  );

  return rows.filter((row) => {
    if (status === "ACTIVE" && !row.active_flag) return false;
    if (status === "INACTIVE" && row.active_flag) return false;

    if (reportsTo && row.reports_to_person_id !== reportsTo) return false;

    if (allowedTitles.size > 0 && !allowedTitles.has(row.position_title)) return false;

    if (filters.seat_types) {
      const showField = filters.seat_types.field ?? true;
      const showLeadership = filters.seat_types.leadership ?? true;
      const showIncomplete = filters.seat_types.incomplete ?? true;
      const key = resolveGroupKey(row);

      if (key === "FIELD" && !showField) return false;
      if (key === "LEADERSHIP" && !showLeadership) return false;
      if (key === "INCOMPLETE" && !showIncomplete) return false;
    }

    if (!search) return true;

    const haystack = [
      row.full_name,
      row.tech_id,
      row.position_title,
      row.reports_to_name,
      row.display.subtitle,
      ...row.display.badges,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

function buildFilters(args: BuildRosterSurfacePayloadArgs, allRows: RosterSeatRow[]): RosterFilters {
  return {
    status: args.status ?? "ACTIVE",
    seat_types: {
      field: args.seat_types?.field ?? true,
      leadership: args.seat_types?.leadership ?? true,
      incomplete: args.seat_types?.incomplete ?? true,
    },
    search: String(args.search ?? ""),
    position_titles: Array.from(new Set(allRows.map((row) => row.position_title))).sort((a, b) =>
      a.localeCompare(b)
    ),
    reports_to_person_id: toMaybeString(args.reports_to_person_id),
  };
}

function buildEmptyPayload(args: BuildRosterSurfaceArgsCompat): RosterSurfacePayload {
  return {
    header: {
      pc_org_id: args.pc_org_id,
      org_name: args.org_name ?? null,
      as_of_date: args.as_of_date,
      total_people: 0,
      total_active_seats: 0,
    },
    filters: {
      status: args.status ?? "ACTIVE",
      seat_types: {
        field: args.seat_types?.field ?? true,
        leadership: args.seat_types?.leadership ?? true,
        incomplete: args.seat_types?.incomplete ?? true,
      },
      search: String(args.search ?? ""),
      position_titles: [],
      reports_to_person_id: toMaybeString(args.reports_to_person_id),
    },
    groups: [
      { key: "FIELD", label: "Field Seats", count: 0, rows: [] },
      { key: "LEADERSHIP", label: "Leadership Seats", count: 0, rows: [] },
      { key: "INCOMPLETE", label: "Incomplete Seats", count: 0, rows: [] },
    ],
    signals: {
      incomplete_count: 0,
      active_seat_count: 0,
      field_seat_count: 0,
      leadership_seat_count: 0,
    },
  };
}

type BuildRosterSurfaceArgsCompat = Omit<BuildRosterSurfacePayloadArgs, "as_of_date"> & {
  as_of_date: string;
};

export async function buildRosterSurfacePayload(
  args: BuildRosterSurfacePayloadArgs
): Promise<RosterSurfacePayload> {
  const asOfDate = toMaybeString(args.as_of_date) ?? todayIso();
  const sb = await supabaseServer();

  const query = sb
    .from("v_company_profile_enriched")
    .select(
      [
        "profile_fact_id",
        "person_id",
        "full_name",
        "person_status",
        "pc_org_id",
        "position_title",
        "role_type",
        "is_field",
        "is_leadership",
        "allows_tech",
        "tech_id",
        "reports_to_person_id",
        "reports_to_full_name",
        "effective_start_date",
        "effective_end_date",
        "active_flag",
      ].join(",")
    )
    .eq("pc_org_id", args.pc_org_id)
    .order("full_name", { ascending: true })
    .order("effective_start_date", { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const sourceRows = (((data ?? []) as unknown) as EnrichedRosterRow[]).filter((row) =>
    overlapsAsOf(row, asOfDate)
  );

  const allSeatRows = sourceRows
    .map(toSeatRow)
    .filter((row): row is RosterSeatRow => !!row);

  if (!allSeatRows.length) {
    return buildEmptyPayload({
      ...args,
      as_of_date: asOfDate,
    });
  }

  const filteredRows = applyFilters(allSeatRows, {
    search: args.search,
    reports_to_person_id: args.reports_to_person_id,
    status: args.status,
    position_titles: args.position_titles,
    seat_types: args.seat_types,
  });

  const groups = buildGroups(filteredRows);

  const selectedPersonId = toMaybeString(args.selected_person_id);
  const selectedRows = selectedPersonId
    ? sortSeatRows(allSeatRows.filter((row) => row.person_id === selectedPersonId))
    : [];

  const selectedSeat =
    selectedRows.find((row) => row.active_flag) ??
    selectedRows[selectedRows.length - 1] ??
    null;

  const selected =
    selectedSeat && selectedRows.length
      ? {
          seat: selectedSeat,
          person: buildPersonSummary(selectedRows)!,
          history: selectedRows.map(toHistoryRow),
        }
      : undefined;

  return {
    header: {
      pc_org_id: args.pc_org_id,
      org_name: args.org_name ?? null,
      as_of_date: asOfDate,
      total_people: new Set(filteredRows.map((row) => row.person_id)).size,
      total_active_seats: filteredRows.filter((row) => row.active_flag).length,
    },
    filters: buildFilters(
      {
        ...args,
        as_of_date: asOfDate,
      },
      allSeatRows
    ),
    groups,
    selected,
    signals: {
      incomplete_count: filteredRows.filter((row) => row.is_incomplete).length,
      active_seat_count: filteredRows.filter((row) => row.active_flag).length,
      field_seat_count: filteredRows.filter((row) => row.is_field).length,
      leadership_seat_count: filteredRows.filter((row) => row.is_leadership).length,
    },
  };
}