// path: apps/web/src/features/role-company-manager/lib/getCompanyManagerRosterSurfacePayload.server.ts

import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { buildRosterSurfacePayload } from "@/shared/server/roster/buildRosterSurfacePayload.server";
import type { RosterSurfacePayload } from "@/shared/types/roster/surfacePayload";

type GetCompanyManagerRosterSurfacePayloadArgs = {
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
  as_of_date?: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildEmptyPayload(args: {
  pc_org_id: string;
  as_of_date: string;
}): RosterSurfacePayload {
  return {
    header: {
      pc_org_id: args.pc_org_id,
      org_name: null,
      as_of_date: args.as_of_date,
      total_people: 0,
      total_active_seats: 0,
    },
    filters: {
      status: "ACTIVE",
      seat_types: {
        field: true,
        leadership: true,
        incomplete: true,
      },
      search: "",
      position_titles: [],
      reports_to_person_id: null,
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

export async function getCompanyManagerRosterSurfacePayload(
  args?: GetCompanyManagerRosterSurfacePayloadArgs
): Promise<RosterSurfacePayload> {
  const scope = await requireSelectedPcOrgServer();
  const asOfDate = String(args?.as_of_date ?? "").trim() || todayIso();

  if (!scope.ok) {
    return buildEmptyPayload({
      pc_org_id: "",
      as_of_date: asOfDate,
    });
  }

  return buildRosterSurfacePayload({
    pc_org_id: scope.selected_pc_org_id,
    as_of_date: asOfDate,

    selected_person_id: args?.selected_person_id ?? null,
    search: args?.search ?? null,
    reports_to_person_id: args?.reports_to_person_id ?? null,
    status: args?.status ?? "ACTIVE",
    position_titles: args?.position_titles ?? null,
    seat_types: {
      field: args?.seat_types?.field ?? true,
      leadership: args?.seat_types?.leadership ?? true,
      incomplete: args?.seat_types?.incomplete ?? true,
    },
  });
}