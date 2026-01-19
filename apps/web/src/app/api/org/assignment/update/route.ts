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


type Body = {
  assignment_id: string;
  tech_id?: string | null;
  position_title?: string | null;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null;   // YYYY-MM-DD | null
  active?: boolean | null;
};

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { assignment_id, ...patch } = body;
  if (!assignment_id) {
    return NextResponse.json({ ok: false, error: "Missing required field: assignment_id" }, { status: 400 });
  }

  const allowed: Record<string, any> = {};
  for (const k of ["tech_id", "position_title", "start_date", "end_date", "active"] as const) {
    if (k in patch) (allowed as any)[k] = (patch as any)[k];
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const svc = getServiceClient();

  // Read current assignment (need person_id for atomic rule checks)
  const { data: current, error: curErr } = await svc
    .from("assignment")
    .select("assignment_id, person_id")
    .eq("assignment_id", assignment_id)
    .single();

  if (curErr || !current) {
    return NextResponse.json({ ok: false, error: curErr?.message || "Assignment not found" }, { status: 404 });
  }

  // Atomic rule guard: one active assignment per person
  // If caller is attempting to make this assignment "active" (active=true and end_date=null),
  // ensure no other active assignment exists for that person.
  const wantsActive =
    (allowed.active === true || allowed.active === undefined) &&
    (("end_date" in allowed && allowed.end_date === null) || !("end_date" in allowed));

  if (wantsActive) {
    const { data: conflicts, error: conflictErr } = await svc
      .from("assignment")
      .select("assignment_id")
      .eq("person_id", current.person_id)
      .eq("active", true)
      .is("end_date", null)
      .neq("assignment_id", assignment_id)
      .limit(1);

    if (conflictErr) {
      return NextResponse.json({ ok: false, error: conflictErr.message }, { status: 500 });
    }
    if ((conflicts ?? []).length > 0) {
      return NextResponse.json(
        { ok: false, error: "Person already has an active assignment" },
        { status: 409 }
      );
    }
  }

  const { error } = await svc.from("assignment").update(allowed).eq("assignment_id", assignment_id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Re-read from master_roster_v for UI convenience
  const { data: row, error: readErr } = await (svc as any)
    .from("master_roster_v")
    .select("*")
    .eq("assignment_id", assignment_id)
    .single();

  if (readErr) {
    return NextResponse.json({ ok: true, row: null });
  }

  return NextResponse.json({ ok: true, row });
}
