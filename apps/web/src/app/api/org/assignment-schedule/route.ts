import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE service env");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function requireUser() {
  const sb = await supabaseServer();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  return { ok: true as const, user: userData.user };
}


type UpsertBody = {
  schedule_id?: string | null;
  assignment_id: string;

  schedule_name: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null;
  default_route_id?: string | null;

  sun?: boolean | null; mon?: boolean | null; tue?: boolean | null; wed?: boolean | null; thu?: boolean | null; fri?: boolean | null; sat?: boolean | null;
  sch_hours_sun?: number; sch_hours_mon?: number; sch_hours_tue?: number; sch_hours_wed?: number; sch_hours_thu?: number; sch_hours_fri?: number; sch_hours_sat?: number;
  sch_units_sun?: number; sch_units_mon?: number; sch_units_tue?: number; sch_units_wed?: number; sch_units_thu?: number; sch_units_fri?: number; sch_units_sat?: number;
};

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const assignment_id = url.searchParams.get("assignment_id");
  if (!assignment_id) {
    return NextResponse.json({ ok: false, error: "Missing assignment_id" }, { status: 400 });
  }

  const svc = getServiceClient();
  const { data, error } = await svc
    .from("schedule")
    .select("*")
    .eq("assignment_id", assignment_id)
    .order("start_date", { ascending: true })
    .order("schedule_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, schedules: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  let body: UpsertBody;
  try {
    body = (await req.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.assignment_id) {
    return NextResponse.json({ ok: false, error: "Missing assignment_id" }, { status: 400 });
  }
  if (!body.schedule_name) {
    return NextResponse.json({ ok: false, error: "Missing schedule_name" }, { status: 400 });
  }
  if (!body.start_date) {
    return NextResponse.json({ ok: false, error: "Missing start_date" }, { status: 400 });
  }

  const svc = getServiceClient();

  const payload: any = {
    assignment_id: body.assignment_id,
    schedule_name: body.schedule_name,
    start_date: body.start_date,
    end_date: body.end_date ?? null,
    default_route_id: body.default_route_id ?? null,

    sun: body.sun ?? false,
    mon: body.mon ?? false,
    tue: body.tue ?? false,
    wed: body.wed ?? false,
    thu: body.thu ?? false,
    fri: body.fri ?? false,
    sat: body.sat ?? false,

    sch_hours_sun: body.sch_hours_sun ?? 0,
    sch_hours_mon: body.sch_hours_mon ?? 0,
    sch_hours_tue: body.sch_hours_tue ?? 0,
    sch_hours_wed: body.sch_hours_wed ?? 0,
    sch_hours_thu: body.sch_hours_thu ?? 0,
    sch_hours_fri: body.sch_hours_fri ?? 0,
    sch_hours_sat: body.sch_hours_sat ?? 0,

    sch_units_sun: body.sch_units_sun ?? 0,
    sch_units_mon: body.sch_units_mon ?? 0,
    sch_units_tue: body.sch_units_tue ?? 0,
    sch_units_wed: body.sch_units_wed ?? 0,
    sch_units_thu: body.sch_units_thu ?? 0,
    sch_units_fri: body.sch_units_fri ?? 0,
    sch_units_sat: body.sch_units_sat ?? 0,
  };

  let schedule_id = body.schedule_id ?? null;

  if (schedule_id) {
    const { error } = await svc.from("schedule").update(payload).eq("schedule_id", schedule_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const { data, error } = await svc.from("schedule").insert(payload).select("schedule_id").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    schedule_id = (data as any)?.schedule_id ?? null;
  }

  const { data: row, error: readErr } = await svc.from("schedule").select("*").eq("schedule_id", schedule_id).single();
  if (readErr) return NextResponse.json({ ok: true, schedule: null });
  return NextResponse.json({ ok: true, schedule: row });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const schedule_id = url.searchParams.get("schedule_id");
  if (!schedule_id) {
    return NextResponse.json({ ok: false, error: "Missing schedule_id" }, { status: 400 });
  }

  const svc = getServiceClient();
  const { error } = await svc.from("schedule").delete().eq("schedule_id", schedule_id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
