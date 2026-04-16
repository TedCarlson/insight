import { Card } from "@/components/ui/Card";
import { getCompanyManagerWorkforceSurfacePayload } from "../lib/getCompanyManagerWorkforceSurfacePayload.server";
import type {
  WorkforceRow,
  WorkforceSeatType,
} from "@/shared/types/workforce/workforce.types";

type WorkforceStatus = "ACTIVE" | "INACTIVE" | "ALL";

type Props = {
  selected_person_id?: string;
  search?: string;
  reports_to_person_id?: string;
  status?: WorkforceStatus;
  as_of_date?: string;
};

function scheduleLabel(row: WorkforceRow) {
  const working = row.schedule.filter((d) => d.state === "WORKING").length;
  const off = row.schedule.filter((d) => d.state === "OFF").length;
  if (working === 0 && off === 0) return "Unknown";
  return `${working}W / ${off}O`;
}

function badgeTone(seatType: WorkforceSeatType) {
  if (seatType === "FIELD") {
    return "border-[var(--to-success)] bg-[color-mix(in_oklab,var(--to-success)_10%,white)] text-foreground";
  }
  if (seatType === "LEADERSHIP") {
    return "border-[var(--to-primary)] bg-[color-mix(in_oklab,var(--to-primary)_10%,white)] text-foreground";
  }
  if (seatType === "INCOMPLETE") {
    return "border-[var(--to-warning)] bg-[color-mix(in_oklab,var(--to-warning)_10%,white)] text-foreground";
  }
  return "border-[var(--to-info)] bg-[color-mix(in_oklab,var(--to-info)_10%,white)] text-foreground";
}

function tabLabel(key: WorkforceSeatType | "ALL") {
  if (key === "ALL") return "All";
  if (key === "FIELD") return "Field";
  if (key === "LEADERSHIP") return "Leadership";
  if (key === "INCOMPLETE") return "Incomplete";
  return "Travel Techs";
}

function filterRowsByTab(
  rows: WorkforceRow[],
  tab: WorkforceSeatType | "ALL"
): WorkforceRow[] {
  if (tab === "ALL") return rows;
  return rows.filter((row) => row.seat_type === tab);
}

function identityLabel(row: WorkforceRow) {
  const lead = row.preferred_name ?? row.first_name ?? row.display_name;
  return row.tech_id ? `${lead} • ${row.tech_id}` : lead;
}

export default async function CompanyManagerWorkforcePageShell(props: Props) {
  const payload = await getCompanyManagerWorkforceSurfacePayload({
    as_of_date: props.as_of_date ?? null,
  });

  const defaultTab: WorkforceSeatType | "ALL" = "FIELD";
  const rows = filterRowsByTab(payload.rows, defaultTab);

  return (
    <div className="space-y-4 p-4">
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Workforce
            </div>

            <div className="mt-1 text-2xl font-semibold tracking-tight">
              Workforce Overview
            </div>

            <div className="mt-2 text-sm text-muted-foreground">
              {payload.summary.total} seats • {payload.summary.field} field •{" "}
              {payload.summary.leadership} leadership •{" "}
              {payload.summary.incomplete} incomplete
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {payload.tabs.map((tab) => (
              <div
                key={tab.key}
                className={[
                  "rounded-xl border px-3 py-2.5",
                  tab.key === defaultTab
                    ? "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)]"
                    : "bg-card",
                ].join(" ")}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tabLabel(tab.key)}
                </div>
                <div className="mt-1 text-xl font-semibold leading-none">
                  {tab.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between rounded-2xl border bg-[color-mix(in_oklab,var(--to-primary)_8%,white)] px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide">
            {tabLabel(defaultTab)}
          </div>

          <div className="text-xs text-muted-foreground">
            {rows.length} rows
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No records.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-[11px]">
                  <th className="px-4 py-3 text-left">Identity</th>
                  <th className="px-3 py-3 text-left">Office</th>
                  <th className="px-3 py-3 text-left">Reports To</th>
                  <th className="px-3 py-3 text-left">Schedule</th>
                  <th className="px-3 py-3 text-left">Seat</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.person_id}-${row.tech_id ?? "no-tech"}`}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--to-ink)]">
                        {identityLabel(row)}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {row.position_title ?? "Unknown Position"}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      {row.office ?? "—"}
                    </td>

                    <td className="px-3 py-3">
                      {row.reports_to_name ? (
                        row.reports_to_name
                      ) : (
                        <span className="font-medium text-[var(--to-warning)]">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">{scheduleLabel(row)}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.schedule.map((day) => (
                          <span
                            key={`${row.person_id}-${day.day}`}
                            className={[
                              "inline-flex min-w-6 items-center justify-center rounded border px-1.5 py-0.5 text-[10px]",
                              day.state === "WORKING"
                                ? "border-[var(--to-success)] bg-[color-mix(in_oklab,var(--to-success)_10%,white)]"
                                : day.state === "OFF"
                                  ? "border-[var(--to-border)] bg-muted/40"
                                  : "border-[var(--to-border)] bg-background",
                            ].join(" ")}
                          >
                            {day.day}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={[
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            badgeTone(row.seat_type),
                          ].join(" ")}
                        >
                          {tabLabel(row.seat_type)}
                        </span>

                        {!row.is_active ? (
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium border-[var(--to-border)] bg-muted/40 text-muted-foreground">
                            Inactive
                          </span>
                        ) : null}

                        {row.is_incomplete ? (
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium border-[var(--to-warning)] bg-[color-mix(in_oklab,var(--to-warning)_10%,white)] text-foreground">
                            Incomplete
                          </span>
                        ) : null}

                        {row.is_travel_tech ? (
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium border-[var(--to-info)] bg-[color-mix(in_oklab,var(--to-info)_10%,white)] text-foreground">
                            Travel
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}