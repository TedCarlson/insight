export function todayInNY(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function eachDayISO(start: string, endInclusive: string): string[] {
  const out: string[] = [];
  let cur = new Date(`${start}T00:00:00Z`);
  const end = new Date(`${endInclusive}T00:00:00Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function weekdayKey(iso: string): "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" {
  // ISO is YYYY-MM-DD. Interpret as NY-local day using UTC midnight (good enough for date keys).
  const d = new Date(`${iso}T00:00:00Z`);
  const n = d.getUTCDay(); // 0=Sun
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[n];
}