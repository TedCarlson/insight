// RUN THIS
// Replace the entire file:
// apps/web/src/app/api/metrics/trend/route.ts

import { NextResponse } from "next/server";

import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

type Direction = "HIGHER_BETTER" | "LOWER_BETTER";
type OverlayState = "UP" | "DOWN" | "FLAT" | "NO_DATA";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isActiveWindow(row: any, today: string) {
  const activeOk = row?.active === true || row?.active == null;
  const startOk = !row?.start_date || String(row.start_date) <= today;
  const endOk = !row?.end_date || String(row.end_date) >= today;
  return activeOk && startOk && endOk;
}

function pickBestTechId(assignments: any[], today: string): string | null {
  if (!assignments?.length) return null;

  const current = assignments.filter((a) => isActiveWindow(a, today) && a?.tech_id);
  const pool = current.length ? current : assignments.filter((a) => a?.tech_id);

  pool.sort((a, b) => String(b?.start_date ?? "").localeCompare(String(a?.start_date ?? "")));
  const best = pool[0]?.tech_id ? String(pool[0].tech_id).trim() : "";
  return best ? best : null;
}

function numOrNull(x: any): number | null {
  const n = typeof x === "string" ? Number(x) : x;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function directionForKpi(kpi_key: string): Direction {
  const k = kpi_key.toLowerCase();
  // These are “bad when higher”
  if (k.includes("repeat") || k.includes("rework") || k.includes("soi") || k.includes("contact_48hr")) return "LOWER_BETTER";
  return "HIGHER_BETTER";
}

function sampleColForKpi(kpi_key: string): string | null {
  const k = kpi_key.toLowerCase();

  // tnps_score is a score, sample is surveys
  if (k === "tnps_score") return "tnps_surveys";

  // ftr_rate sample is eligible jobs in denominator
  if (k === "ftr_rate") return "total_ftr_contact_jobs";

  // tool_usage_rate sample is eligible jobs
  if (k === "tool_usage_rate") return "tu_eligible_jobs";

  // contact_48hr_rate sample is orders
  if (k === "contact_48hr_rate") return "contact_48hr_orders";

  // met_rate sample is total_appts (denominator)
  if (k === "met_rate") return "total_appts";

  // repeat/rework sample counts
  if (k === "repeat_rate") return "repeat_count";
  if (k === "rework_rate") return "rework_count";

  // pht_pure_pass_rate sample is pht_pure_pass (count)
  if (k === "pht_pure_pass_rate") return "pht_pure_pass";

  // soi_rate sample is SOI Count (not present in tech_fact_day today)
  return null;
}

function computeAvg(series: { value: number | null }[], windowDays: number) {
  const slice = series.slice(-windowDays);
  const vals = slice.map((s) => s.value).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return sum / vals.length;
}

function computeState(direction: Direction, delta: number | null): OverlayState {
  if (delta === null || !Number.isFinite(delta)) return "NO_DATA";

  const eps = 1e-9;
  if (Math.abs(delta) < eps) return "FLAT";

  if (direction === "HIGHER_BETTER") return delta > 0 ? "UP" : "DOWN";
  // LOWER_BETTER: negative delta is good (down is up)
  return delta < 0 ? "UP" : "DOWN";
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const person_id = url.searchParams.get("person_id");
  const kpi_key = (url.searchParams.get("kpi_key") ?? "").trim();
  const range_days = clamp(Number(url.searchParams.get("range_days") ?? "30"), 7, 90);

  if (!person_id) {
    return NextResponse.json(
      { ok: false, error: "person_id is required" },
      { status: 400 },
    );
  }
  if (!kpi_key) {
    return NextResponse.json(
      { ok: false, error: "kpi_key is required" },
      { status: 400 },
    );
  }

  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) {
    return NextResponse.json(
      { ok: false, error: "No org selected" },
      { status: 401 },
    );
  }

  const pc_org_id = scope.selected_pc_org_id;
  const direction = directionForKpi(kpi_key);
  const sample_col = sampleColForKpi(kpi_key);

  // Resolve tech_id for selected org (strict, but do not crash: return NO_DATA series)
  const admin = supabaseAdmin();
  const today = isoDay(new Date());

  const { data: asgRows, error: asgErr } = await admin
    .from("assignment")
    .select("tech_id,start_date,end_date,active")
    .eq("pc_org_id", pc_org_id)
    .eq("person_id", person_id)
    .limit(500);

  if (asgErr) {
    return NextResponse.json(
      { ok: false, error: `Assignment lookup failed: ${asgErr.message}` },
      { status: 500 },
    );
  }

  const tech_id = pickBestTechId((asgRows ?? []) as any[], today);

  // Build full date spine for the requested window (always stable shape)
  const end = new Date();
  const start = addDays(end, -(range_days - 1));
  const spine = Array.from({ length: range_days }, (_, i) => isoDay(addDays(start, i)));

  // If no tech_id, return NO_DATA spine (keeps UI alive and explains why trend is blank)
  if (!tech_id) {
    const series = spine.map((metric_date) => ({ metric_date, value: null as number | null, sample: null as number | null }));

    return NextResponse.json({
      ok: true,
      pc_org_id,
      tech_id: null,
      person_id,
      kpi_key,
      range_days,
      direction,
      series,
      overlays: {
        short_window_days: 7,
        long_window_days: 30,
        short_avg: null,
        long_avg: null,
        delta: null,
        state: "NO_DATA" as OverlayState,
      },
      notes: "No tech assignment found for selected org.",
    });
  }

  // Query facts (real)
  const sb = await supabaseServer();

  // IMPORTANT: PostgREST select string needs explicit columns
  const selectCols = `metric_date,${kpi_key}${sample_col ? `,${sample_col}` : ""}`;

  const { data: factRows, error: factErr } = await sb
    .from("metrics_tech_fact_day")
    .select(selectCols)
    .eq("pc_org_id", pc_org_id)
    .eq("tech_id", tech_id)
    .gte("metric_date", isoDay(start))
    .lte("metric_date", isoDay(end))
    .order("metric_date", { ascending: true })
    .limit(500);

  if (factErr) {
    return NextResponse.json(
      { ok: false, error: `Fact lookup failed: ${factErr.message}` },
      { status: 500 },
    );
  }

  const byDay = new Map<string, { value: number | null; sample: number | null }>();
  for (const r of (factRows ?? []) as any[]) {
    const d = r?.metric_date ? String(r.metric_date).slice(0, 10) : null;
    if (!d) continue;

    const v = numOrNull(r?.[kpi_key]);
    const s = sample_col ? numOrNull(r?.[sample_col]) : null;

    byDay.set(d, { value: v, sample: s });
  }

  const series = spine.map((metric_date) => {
    const hit = byDay.get(metric_date);
    return {
      metric_date,
      value: hit?.value ?? null,
      sample: hit?.sample ?? null,
    };
  });

  const short_avg = computeAvg(series, 7);
  const long_avg = computeAvg(series, Math.min(30, series.length));
  const delta = short_avg !== null && long_avg !== null ? short_avg - long_avg : null;
  const state = computeState(direction, delta);

  return NextResponse.json({
    ok: true,
    pc_org_id,
    tech_id,
    person_id,
    kpi_key,
    range_days,
    direction,
    series,
    overlays: {
      short_window_days: 7,
      long_window_days: 30,
      short_avg,
      long_avg,
      delta,
      state,
    },
  });
}