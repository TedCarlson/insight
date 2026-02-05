"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ImportRow } from "./ImportedRowsCardClient";

function withinWindow(iso: string, today: string, maxDay: string) {
  return iso >= today && iso <= maxDay;
}

function dowShort(iso: string): string {
  // Use midday UTC so the weekday doesn't shift in America/New_York
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/New_York" }).format(d);
}

function splitRouteAreas(raw: string | null): string[] {
  if (!raw) return [];
  const s = raw.trim();
  if (!s) return [];
  return s
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function RollupsCardClient({
  rows,
  today,
  maxDay,
}: {
  rows: ImportRow[];
  today: string;
  maxDay: string;
}) {
  const [day, setDay] = useState("");

  const activeDay = day && withinWindow(day, today, maxDay) ? day : "";
  const scopedRows = useMemo(() => {
    if (!activeDay) return rows;
    return rows.filter((r) => r.shift_date === activeDay);
  }, [rows, activeDay]);

  const dailyRollups = useMemo(() => {
    const map = new Map<string, { shift_date: string; techs: Set<string>; totalUnits: number; totalHours: number }>();

    for (const r of scopedRows) {
      const key = r.shift_date;
      if (!map.has(key)) {
        map.set(key, { shift_date: key, techs: new Set<string>(), totalUnits: 0, totalHours: 0 });
      }
      const agg = map.get(key)!;
      if (r.tech_id) agg.techs.add(String(r.tech_id));
      if (typeof r.target_unit === "number") agg.totalUnits += r.target_unit;
      if (typeof r.shift_duration === "number") agg.totalHours += r.shift_duration;
    }

    return Array.from(map.values()).sort((a, b) => a.shift_date.localeCompare(b.shift_date));
  }, [scopedRows]);

  const routeAreaModel = useMemo(() => {
    const windowTechs = new Set<string>();
    let windowTotalUnits = 0;
    let windowTotalHours = 0;

    const distinctRouteAreas = new Set<string>();
    const raMap = new Map<string, { route_area: string; techs: Set<string>; totalUnits: number; totalHours: number }>();

    for (const r of scopedRows) {
      if (r.tech_id) windowTechs.add(String(r.tech_id));
      if (typeof r.target_unit === "number") windowTotalUnits += r.target_unit;
      if (typeof r.shift_duration === "number") windowTotalHours += r.shift_duration;

      const areas = splitRouteAreas(r.route_areas);
      for (const a of areas) distinctRouteAreas.add(a);

      if (!areas.length) continue;
      for (const area of areas) {
        if (!raMap.has(area)) {
          raMap.set(area, { route_area: area, techs: new Set<string>(), totalUnits: 0, totalHours: 0 });
        }
        const agg = raMap.get(area)!;
        if (r.tech_id) agg.techs.add(String(r.tech_id));
        if (typeof r.target_unit === "number") agg.totalUnits += r.target_unit;
        if (typeof r.shift_duration === "number") agg.totalHours += r.shift_duration;
      }
    }

    const routeAreaRollups = Array.from(raMap.values()).sort((a, b) => {
      if (b.totalUnits !== a.totalUnits) return b.totalUnits - a.totalUnits;
      return a.route_area.localeCompare(b.route_area);
    });

    return {
      windowTechs,
      windowTotalUnits,
      windowTotalHours,
      distinctRouteAreas,
      routeAreaRollups,
    };
  }, [scopedRows]);

  return (
    <Card>
      <div className="space-y-5">
        {/* Daily */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Daily rollup</div>

            {/* instant day filter */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={day}
                min={today}
                max={maxDay}
                onChange={(e) => setDay(e.target.value)}
                className="h-8 rounded-md border border-[color:var(--to-border)] bg-transparent px-2 text-xs"
              />

              {activeDay ? (
                <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setDay("")}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--to-ink-muted)]">
                <tr className="border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">DOW</th>
                  <th className="py-2 pr-4">Techs Built</th>
                  <th className="py-2 pr-4">Total Units</th>
                  <th className="py-2 pr-4">Total Hours</th>
                </tr>
              </thead>

              <tbody>
                {dailyRollups.length === 0 ? (
                  <tr>
                    <td className="py-6 text-[var(--to-ink-muted)]" colSpan={5}>
                      No rows to roll up{activeDay ? ` for ${activeDay}.` : " in the current window."}
                    </td>
                  </tr>
                ) : (
                  dailyRollups.map((d) => (
                    <tr key={d.shift_date} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">{d.shift_date}</td>
                      <td className="py-2 pr-4">{dowShort(d.shift_date)}</td>
                      <td className="py-2 pr-4">{d.techs.size}</td>
                      <td className="py-2 pr-4">{Math.round(d.totalUnits)}</td>
                      <td className="py-2 pr-4">{Number.isFinite(d.totalHours) ? d.totalHours.toFixed(1) : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            Rollup is computed from the imported rows in the 14-day window (today onward)
            {activeDay ? `, filtered to ${activeDay}.` : "."}
          </div>
        </div>

        {/* Route Areas */}
        <div className="space-y-3 pt-2 border-t border-[color:var(--to-border)]">
          <div className="text-sm font-medium">Route Areas rollup</div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="text-left text-[var(--to-ink-muted)]">
                <tr className="border-b">
                  <th className="py-2 pr-4 w-[46%]">Route Area</th>
                  <th className="py-2 pr-4 w-[18%]">Techs Built</th>
                  <th className="py-2 pr-4 w-[18%]">Total Units</th>
                  <th className="py-2 pr-4 w-[18%]">Total Hours</th>
                </tr>
              </thead>

              <tbody>
                {/* Totals row */}
                <tr className="border-b bg-black/5">
                  <td className="py-2 pr-4 font-medium truncate">{routeAreaModel.distinctRouteAreas.size}</td>
                  <td className="py-2 pr-4 font-medium">{routeAreaModel.windowTechs.size}</td>
                  <td className="py-2 pr-4 font-medium">{Math.round(routeAreaModel.windowTotalUnits)}</td>
                  <td className="py-2 pr-4 font-medium">
                    {Number.isFinite(routeAreaModel.windowTotalHours) ? routeAreaModel.windowTotalHours.toFixed(1) : "—"}
                  </td>
                </tr>

                {routeAreaModel.routeAreaRollups.length === 0 ? (
                  <tr>
                    <td className="py-6 text-[var(--to-ink-muted)]" colSpan={4}>
                      No route area rows{activeDay ? ` for ${activeDay}.` : " in the current window."}
                    </td>
                  </tr>
                ) : (
                  routeAreaModel.routeAreaRollups.slice(0, 50).map((ra) => (
                    <tr key={ra.route_area} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 truncate">{ra.route_area}</td>
                      <td className="py-2 pr-4">{ra.techs.size}</td>
                      <td className="py-2 pr-4">{Math.round(ra.totalUnits)}</td>
                      <td className="py-2 pr-4">{Number.isFinite(ra.totalHours) ? ra.totalHours.toFixed(1) : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {routeAreaModel.routeAreaRollups.length > 50 ? (
            <div className="text-xs text-[var(--to-ink-muted)]">Showing top 50 route areas (by Total Units).</div>
          ) : null}

          <div className="text-xs text-[var(--to-ink-muted)]">
            Note: if a row has multiple Route Areas separated by comma/semicolon, route-area totals apply the row to each listed label.
          </div>
        </div>
      </div>
    </Card>
  );
}