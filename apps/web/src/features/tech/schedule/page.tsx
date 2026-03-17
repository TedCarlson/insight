// apps/web/src/features/tech/schedule/page.tsx

import { getTechScheduleCalendar } from "@/features/tech/schedule/lib/getTechScheduleCalendar";

function weekdayShort(idx: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]!;
}

function buildMonthDays(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));

  const days: string[] = [];
  let cur = first;

  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur = new Date(
      Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 1)
    );
  }

  return days;
}

function buildCells(days: string[]) {
  const first = new Date(days[0] + "T00:00:00Z");
  const pad = first.getUTCDay();

  const cells: Array<{ date: string | null }> = [];

  for (let i = 0; i < pad; i += 1) cells.push({ date: null });
  for (const d of days) cells.push({ date: d });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return cells;
}

function dayNum(iso: string) {
  return Number(iso.slice(8, 10));
}

export default async function TechScheduleFeaturePage() {
  const payload = await getTechScheduleCalendar();
  const days = buildMonthDays(payload.year, payload.month);
  const cells = buildCells(days);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Schedule
        </div>

        <div className="mt-2 text-lg font-semibold">{payload.monthLabel}</div>

        {!payload.ok ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {payload.reason === "no_org" && "No org is selected."}
            {payload.reason === "no_person" && "No person is linked to this login."}
            {payload.reason === "no_active_assignment" &&
              "No active assignment was found for this tech."}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={idx}
              className="text-center text-[11px] font-medium text-muted-foreground"
            >
              {weekdayShort(idx)}
            </div>
          ))}

          {cells.map((cell, idx) => {
            if (!cell.date) {
              return (
                <div
                  key={idx}
                  className="aspect-square rounded-xl border border-transparent"
                />
              );
            }

            const scheduled = payload.scheduledDates.has(cell.date);
            const isToday = cell.date === payload.todayIso;

            const style = scheduled
              ? {
                  borderColor:
                    "color-mix(in oklab, var(--to-success) 55%, var(--to-border))",
                  backgroundColor:
                    "color-mix(in oklab, var(--to-success) 12%, var(--to-surface))",
                }
              : {
                  borderColor:
                    "color-mix(in oklab, var(--to-warning) 55%, var(--to-border))",
                  backgroundColor:
                    "color-mix(in oklab, var(--to-warning) 12%, var(--to-surface))",
                };

            return (
              <div
                key={cell.date}
                className={`aspect-square cursor-pointer rounded-xl border p-2 active:scale-[0.98] ${
                  isToday ? "ring-2 ring-[var(--to-accent)]" : ""
                }`}
                style={style}
                title={`${cell.date} • ${scheduled ? "Scheduled" : "Off"}`}
              >
                <div className="flex h-full items-start justify-end">
                  <span className="text-sm font-semibold">{dayNum(cell.date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}