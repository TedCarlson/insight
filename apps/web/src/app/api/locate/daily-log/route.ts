import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

type Frame = "AM" | "PM";

type PostBody = {
  log_date: string; // YYYY-MM-DD
  frame: Frame;
  rows: Array<{
    state_code: string;
    manpower_count: number;
    tickets_total: number; // AM received OR PM closed
    project_tickets: number;
    emergency_tickets: number;
  }>;
};

function isISODate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function n(v: any): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let isOwner = false;
  try {
    const { data } = await sb.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }
  if (!isOwner) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!isISODate(date)) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("locate_daily_call_log_v")
    .select(
      "log_date,state_code,state_name,manpower_count,tickets_received_am,tickets_closed_pm,project_tickets,emergency_tickets,backlog_start,backlog_end,avg_received_per_tech,avg_closed_per_tech,updated_at"
    )
    .eq("log_date", date)
    .order("state_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "daily_log_fetch_failed", details: error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer();

  const { data: userData, error: userErr } = await sb.auth.getUser();
  const user = userData?.user ?? null;
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let isOwner = false;
  try {
    const { data } = await sb.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }
  if (!isOwner) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { log_date, frame } = body;
  if (!isISODate(log_date)) return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  if (frame !== "AM" && frame !== "PM") return NextResponse.json({ ok: false, error: "invalid_frame" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !service) {
    return NextResponse.json({ ok: false, error: "missing_service_env" }, { status: 500 });
  }

  // Use service-role to avoid RLS complexity for phase-1 (owner-only endpoint)
  const admin = createClient(supabaseUrl, service, { auth: { persistSession: false } });

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ ok: false, error: "no_rows" }, { status: 400 });

  // Basic validation: project + emergency must not exceed total
  for (const r of rows) {
    const total = n(r.tickets_total);
    const proj = n(r.project_tickets);
    const emer = n(r.emergency_tickets);
    if (proj + emer > total) {
      return NextResponse.json(
        { ok: false, error: "invalid_breakdown", details: { state_code: r.state_code, total, proj, emer } },
        { status: 400 }
      );
    }
  }

  // Upsert by (log_date, state_code) but don’t erase the other frame’s field.
  for (const r of rows) {
    const state_code = String(r.state_code ?? "").trim().toUpperCase();
    if (!state_code) continue;

    const patch: any = {
      log_date,
      state_code,
      manpower_count: n(r.manpower_count),
      project_tickets: n(r.project_tickets),
      emergency_tickets: n(r.emergency_tickets),
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (frame === "AM") patch.tickets_received_am = n(r.tickets_total);
    if (frame === "PM") patch.tickets_closed_pm = n(r.tickets_total);

    // Pull existing so we preserve the other frame's numbers during the upsert.
    const existing = await admin
      .from("locate_daily_call_log")
      .select("tickets_received_am,tickets_closed_pm")
      .eq("log_date", log_date)
      .eq("state_code", state_code)
      .maybeSingle();

    if (existing.data) {
      if (frame === "AM") patch.tickets_closed_pm = existing.data.tickets_closed_pm ?? 0;
      if (frame === "PM") patch.tickets_received_am = existing.data.tickets_received_am ?? 0;
    }

    const up = await admin
      .from("locate_daily_call_log")
      .upsert({ ...patch, created_by: user.id }, { onConflict: "log_date,state_code" });

    if (up.error) {
      return NextResponse.json({ ok: false, error: "upsert_failed", details: up.error }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}