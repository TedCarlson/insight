// apps/web/src/app/api/locate/daily-log/route.ts
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
    project_tickets: number; // independent (not subset)
    emergency_tickets: number; // independent (not subset)
  }>;
};

function isISODate(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function n(v: any): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

async function requireOwnerOrAdmin(sb: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data: userData, error: userErr } = await sb.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return { ok: false as const, status: 401 as const, user: null, error: "unauthorized" as const };
  }

  // Gate: owner OR admin
  let allowed = false;
  try {
    const [{ data: owner }, { data: admin }] = await Promise.all([sb.rpc("is_owner"), sb.rpc("is_admin")]);
    allowed = Boolean(owner) || Boolean(admin);
  } catch {
    allowed = false;
  }

  if (!allowed) {
    return { ok: false as const, status: 403 as const, user: null, error: "forbidden" as const };
  }

  return { ok: true as const, status: 200 as const, user, error: null };
}

function getServiceAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !service) return null;

  return createClient(supabaseUrl, service, { auth: { persistSession: false } });
}

/**
 * Policy:
 * - signed-in AND (owner OR admin) can use Locate endpoints
 * - server uses service-role to avoid RLS surprises while incubating Locate
 */
export async function GET(req: NextRequest) {
  const sb = await supabaseServer();

  const gate = await requireOwnerOrAdmin(sb);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!isISODate(date)) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }

  const admin = getServiceAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "missing_service_env" }, { status: 500 });
  }

  const { data, error } = await admin
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

  const gate = await requireOwnerOrAdmin(sb);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { log_date, frame } = body;
  if (!isISODate(log_date)) return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  if (frame !== "AM" && frame !== "PM") return NextResponse.json({ ok: false, error: "invalid_frame" }, { status: 400 });

  const admin = getServiceAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "missing_service_env" }, { status: 500 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ ok: false, error: "no_rows" }, { status: 400 });

  // Normalize + validate
  const normalized = rows
    .map((r) => ({
      state_code: String(r.state_code ?? "").trim().toUpperCase(),
      manpower_count: n(r.manpower_count),
      tickets_total: n(r.tickets_total),
      project_tickets: n(r.project_tickets),
      emergency_tickets: n(r.emergency_tickets),
    }))
    .filter((r) => Boolean(r.state_code));

  if (!normalized.length) {
    return NextResponse.json({ ok: false, error: "no_valid_rows" }, { status: 400 });
  }

  for (const r of normalized) {
    if (r.manpower_count < 0 || r.tickets_total < 0 || r.project_tickets < 0 || r.emergency_tickets < 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_numbers", details: { state_code: r.state_code } },
        { status: 400 }
      );
    }
  }

  // Pull existing rows for (log_date, state_codes) once, so we can preserve the other frame.
  const stateCodes = Array.from(new Set(normalized.map((r) => r.state_code)));
  const existingRes = await admin
    .from("locate_daily_call_log")
    .select("state_code,tickets_received_am,tickets_closed_pm")
    .eq("log_date", log_date)
    .in("state_code", stateCodes);

  if (existingRes.error) {
    return NextResponse.json({ ok: false, error: "existing_fetch_failed", details: existingRes.error }, { status: 400 });
  }

  const existingMap: Record<string, { tickets_received_am: number; tickets_closed_pm: number }> = {};
  for (const e of existingRes.data ?? []) {
    const code = String((e as any).state_code ?? "").toUpperCase();
    if (!code) continue;
    existingMap[code] = {
      tickets_received_am: Number((e as any).tickets_received_am ?? 0),
      tickets_closed_pm: Number((e as any).tickets_closed_pm ?? 0),
    };
  }

  const nowIso = new Date().toISOString();

  // Build upsert payloads
  const upserts = normalized.map((r) => {
    const prior = existingMap[r.state_code] ?? { tickets_received_am: 0, tickets_closed_pm: 0 };

    const tickets_received_am = frame === "AM" ? r.tickets_total : prior.tickets_received_am;
    const tickets_closed_pm = frame === "PM" ? r.tickets_total : prior.tickets_closed_pm;

    return {
      log_date,
      state_code: r.state_code,
      manpower_count: r.manpower_count,
      tickets_received_am,
      tickets_closed_pm,
      project_tickets: r.project_tickets,
      emergency_tickets: r.emergency_tickets,
      updated_at: nowIso,
      updated_by: gate.user!.id,
      created_by: gate.user!.id,
    };
  });

  const up = await admin.from("locate_daily_call_log").upsert(upserts, { onConflict: "log_date,state_code" });

  if (up.error) {
    return NextResponse.json({ ok: false, error: "upsert_failed", details: up.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: upserts.length }, { status: 200 });
}