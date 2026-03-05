import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kpi_key = url.searchParams.get("kpi_key") ?? "tnps";
  const range_days = Number(url.searchParams.get("range_days") ?? "30");

  const series = Array.from({ length: Math.min(Math.max(range_days, 7), 90) }, (_, i) => ({
    metric_date: new Date(Date.now() - (range_days - 1 - i) * 24 * 3600 * 1000).toISOString().slice(0, 10),
    value: null as number | null,
    sample: null as number | null,
  }));

  return NextResponse.json({
    kpi_key,
    range_days,
    direction: "HIGHER_BETTER",
    series,
    overlays: {
      short_window_days: 7,
      long_window_days: 30,
      short_avg: null,
      long_avg: null,
      delta: null,
      state: "NO_DATA",
    },
  });
}