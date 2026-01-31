// apps/web/src/app/route-lock/schedule/ScheduleGridClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";

type Technician = {
  assignment_id: string;
  tech_id: string;
  full_name: string;
};

type RouteRow = { route_id: string; route_name: string };

type ScheduleRow = {
  schedule_id: string;
  assignment_id: string;
  start_date: string;
  end_date: string | null;
  default_route_id: string | null;
  sun: boolean | null;
  mon: boolean | null;
  tue: boolean | null;
  wed: boolean | null;
  thu: boolean | null;
  fri: boolean | null;
  sat: boolean | null;
};

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

type RowState = {
  assignmentId: string;
  techId: string;
  name: string;
  routeId: string; // "" for unset
  days: Record<DayKey, boolean>;
};

export type ScheduleTotals = {
  techs: number;
  perDay: Record<DayKey, number>;
  totalDaysOn: number;
  totalHours: number;
  totalUnits: number;
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function DayToggle({
  dayLabel,
  value,
  onToggle,
}: {
  dayLabel: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cls(
        "to-pill w-full text-center select-none",
        value
          ? "border-[var(--to-success)] text-[var(--to-success)] bg-[var(--to-toggle-active-bg)]"
          : "border-[var(--to-warning)] text-[var(--to-warning)] bg-[var(--to-surface-soft)]"
      )}
      aria-pressed={value}
    >
      {value ? dayLabel : "Off"}
    </button>
  );
}

export function ScheduleGridClient({
  technicians,
  routes,
  scheduleByAssignment,
  defaults,
  onTotalsChange,
}: {
  technicians: Technician[];
  routes: RouteRow[];
  scheduleByAssignment: Record<string, ScheduleRow>;
  defaults: { unitsPerHour: number; hoursPerDay: number };
  onTotalsChange?: (t: ScheduleTotals) => void;
}) {
  const [rows, setRows] = useState<RowState[]>(() => {
    return technicians.map((t) => {
      const s = scheduleByAssignment[t.assignment_id];
      return {
        assignmentId: t.assignment_id,
        techId: t.tech_id,
        name: t.full_name,
        routeId: String(s?.default_route_id ?? ""),
        // default ON when null/undefined
        days: {
          sun: s?.sun ?? true,
          mon: s?.mon ?? true,
          tue: s?.tue ?? true,
          wed: s?.wed ?? true,
          thu: s?.thu ?? true,
          fri: s?.fri ?? true,
          sat: s?.sat ?? true,
        },
      };
    });
  });

  const totals = useMemo<ScheduleTotals>(() => {
    const perDay: Record<DayKey, number> = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };
    let totalDaysOn = 0;

    for (const r of rows) {
      for (const d of DAYS) {
        if (r.days[d.key]) {
          perDay[d.key] += 1;
          totalDaysOn += 1;
        }
      }
    }

    const totalHours = totalDaysOn * defaults.hoursPerDay;
    const totalUnits = totalHours * defaults.unitsPerHour;

    return {
      techs: rows.length,
      perDay,
      totalDaysOn,
      totalHours,
      totalUnits,
    };
  }, [rows, defaults.hoursPerDay, defaults.unitsPerHour]);

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [totals, onTotalsChange]);

  const gridStyle = useMemo(
    () =>
      ({
        gridTemplateColumns:
          "6rem minmax(12rem,1fr) 12rem repeat(7, 5.5rem) minmax(16rem, 0.9fr)",
      }) as const,
    []
  );

  return (
    <Card>
        <DataTableRow gridStyle={gridStyle}>
            <div className="whitespace-nowrap font-medium"></div>
            <div className="min-w-0 font-medium"></div>
            <div className="min-w-0 font-medium">Scheduled Totals</div>

            {DAYS.map((d) => (
              <div key={d.key} className="text-center">
                <span className="text-sm font-medium">{totals.perDay[d.key]}</span>
              </div>
            ))}

            {/* Stats column intentionally blank now */}
            <div />
          </DataTableRow>
      <DataTable layout="fixed" gridStyle={gridStyle}>
        <DataTableHeader gridStyle={gridStyle}>
          <div className="whitespace-nowrap">Tech Id</div>
          <div className="min-w-0">Name</div>
          <div className="whitespace-nowrap">Route</div>
          {DAYS.map((d) => (
            <div key={d.key} className="text-center whitespace-nowrap">
              {d.label}
            </div>
          ))}
          <div className="whitespace-nowrap">Stats</div>
        </DataTableHeader>

        <DataTableBody zebra>
          {/* Totals row: keep day column totals; remove the big stats block from Stats column */}
          

          {rows.map((r) => {
            const daysOn = Object.values(r.days).reduce((acc, v) => acc + (v ? 1 : 0), 0);
            const hours = daysOn * defaults.hoursPerDay;
            const units = hours * defaults.unitsPerHour;

            return (
              <DataTableRow key={r.assignmentId} gridStyle={gridStyle}>
                <div className="whitespace-nowrap">{r.techId}</div>
                <div className="min-w-0 truncate">{r.name}</div>

                <div>
                  <select
                    className="to-select"
                    value={r.routeId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x) => (x.assignmentId === r.assignmentId ? { ...x, routeId: v } : x))
                      );
                    }}
                  >
                    <option value="">—</option>
                    {routes.map((rt) => (
                      <option key={rt.route_id} value={rt.route_id}>
                        {rt.route_name}
                      </option>
                    ))}
                  </select>
                </div>

                {DAYS.map((d) => (
                  <div key={d.key} className="text-center">
                    <DayToggle
                      dayLabel={d.label}
                      value={r.days[d.key]}
                      onToggle={() => {
                        setRows((prev) =>
                          prev.map((x) =>
                            x.assignmentId === r.assignmentId
                              ? { ...x, days: { ...x.days, [d.key]: !x.days[d.key] } }
                              : x
                          )
                        );
                      }}
                    />
                  </div>
                ))}

                <div className="text-sm">
                  <span className="font-medium">{daysOn}</span> {daysOn === 1 ? "day" : "days"} •{" "}
                  <span className="font-medium">{units}</span> units •{" "}
                  <span className="font-medium">{hours}</span> hours
                </div>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </Card>
  );
}
