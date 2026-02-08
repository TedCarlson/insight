export type DayKey = "qh_sun" | "qh_mon" | "qh_tue" | "qh_wed" | "qh_thu" | "qh_fri" | "qh_sat";

export const DAY_KEYS: DayKey[] = ["qh_sun", "qh_mon", "qh_tue", "qh_wed", "qh_thu", "qh_fri", "qh_sat"];

export function toInt(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: "qh_sun", label: "Sun" },
  { key: "qh_mon", label: "Mon" },
  { key: "qh_tue", label: "Tue" },
  { key: "qh_wed", label: "Wed" },
  { key: "qh_thu", label: "Thu" },
  { key: "qh_fri", label: "Fri" },
  { key: "qh_sat", label: "Sat" },
];

export type WriteRow = {
  route_id: string;
  qh_sun: number;
  qh_mon: number;
  qh_tue: number;
  qh_wed: number;
  qh_thu: number;
  qh_fri: number;
  qh_sat: number;
};

const BLANK_ROW: WriteRow = {
  route_id: "",
  qh_sun: 0,
  qh_mon: 0,
  qh_tue: 0,
  qh_wed: 0,
  qh_thu: 0,
  qh_fri: 0,
  qh_sat: 0,
};

export function blankWriteRows(): WriteRow[] {
  return [{ ...BLANK_ROW }];
}

export function cloneBlankWriteRow(): WriteRow {
  return { ...BLANK_ROW };
}

export function sumRowHours(row: Partial<Record<DayKey, unknown>>): number {
  let t = 0;
  for (const k of DAY_KEYS) t += toInt(row[k]);
  return t;
}

export function computeTotalsFromRows(rows: Array<Record<DayKey, unknown>>) {
  const dayHours: Record<DayKey, number> = {
    qh_sun: 0,
    qh_mon: 0,
    qh_tue: 0,
    qh_wed: 0,
    qh_thu: 0,
    qh_fri: 0,
    qh_sat: 0,
  };

  for (const r of rows) {
    for (const k of DAY_KEYS) dayHours[k] += toInt(r[k]);
  }

  const totalHours = DAY_KEYS.reduce((acc, k) => acc + dayHours[k], 0);
  const totalUnits = totalHours * 12;
  const techDays = DAY_KEYS.reduce((acc, k) => acc + Math.ceil(dayHours[k] / 8), 0);

  return { dayHours, totalHours, totalUnits, techDays };
}

