import { supabaseAdmin } from "@/shared/data/supabase/admin";

export type RangeKey = "FM" | "3FM" | "12FM";

export type RawMetricRow = {
  tech_id: string;
  metric_date: string;
  fiscal_end_date: string;
  batch_id: string;
  raw: Record<string, unknown>;
};

export function monthsToTake(range: RangeKey) {
  if (range === "3FM") return 3;
  if (range === "12FM") return 12;
  return 1;
}

export function parseRaw(raw: unknown): Record<string, unknown> {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export function pickNum(
  obj: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = obj?.[key];
    if (value == null) continue;

    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

export function avgOrNull(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computePct(
  denominator: number,
  numerator: number
): number | null {
  if (denominator > 0) return (100 * numerator) / denominator;
  return null;
}

export function computeTnpsScore(
  surveys: number,
  promoters: number,
  detractors: number
): number | null {
  if (surveys > 0) return (100 * (promoters - detractors)) / surveys;
  return null;
}

export async function fetchMetricRawRows(args: {
  admin?: ReturnType<typeof supabaseAdmin>;
  techIds: string[];
  pcOrgIds: string[];
}): Promise<RawMetricRow[]> {
  const admin = args.admin ?? supabaseAdmin();

  if (!args.techIds.length || !args.pcOrgIds.length) {
    return [];
  }

  const { data, error } = await admin
    .from("metrics_raw_row")
    .select("tech_id,metric_date,fiscal_end_date,batch_id,raw")
    .in("pc_org_id", args.pcOrgIds)
    .in("tech_id", args.techIds)
    .order("fiscal_end_date", { ascending: false })
    .order("metric_date", { ascending: false })
    .order("batch_id", { ascending: false })
    .limit(10000);

  if (error) {
    throw new Error(`fetchMetricRawRows failed: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    tech_id: String(row.tech_id ?? ""),
    metric_date: String(row.metric_date ?? "").slice(0, 10),
    fiscal_end_date: String(row.fiscal_end_date ?? "").slice(0, 10),
    batch_id: String(row.batch_id ?? ""),
    raw: parseRaw(row.raw),
  }));
}

export function groupRowsByTech(rows: RawMetricRow[]) {
  const map = new Map<string, RawMetricRow[]>();

  for (const row of rows) {
    const arr = map.get(row.tech_id) ?? [];
    arr.push(row);
    map.set(row.tech_id, arr);
  }

  return map;
}

export function groupRowsByFiscalMonth(rows: RawMetricRow[]) {
  const map = new Map<string, RawMetricRow[]>();

  for (const row of rows) {
    const arr = map.get(row.fiscal_end_date) ?? [];
    arr.push(row);
    map.set(row.fiscal_end_date, arr);
  }

  return map;
}

export function getFinalRowsPerMonth(rows: RawMetricRow[]) {
  const grouped = groupRowsByFiscalMonth(rows);
  const out: Array<{
    fiscal_end_date: string;
    row: RawMetricRow;
    rows_in_month: number;
  }> = [];

  for (const [fiscal_end_date, arr] of grouped) {
    arr.sort((a, b) => {
      const byMetricDate = b.metric_date.localeCompare(a.metric_date);
      if (byMetricDate !== 0) return byMetricDate;
      return b.batch_id.localeCompare(a.batch_id);
    });

    out.push({
      fiscal_end_date,
      row: arr[0],
      rows_in_month: arr.length,
    });
  }

  out.sort((a, b) => b.fiscal_end_date.localeCompare(a.fiscal_end_date));
  return out;
}