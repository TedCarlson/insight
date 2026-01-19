import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE service env");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

type Body = {
  pc_org_id: string;
  person_id: string;
  position_title: string;
  start_date: string; // YYYY-MM-DD
  tech_id?: string | null;
  notes?: string | null;
};

export async function POST(req: Request) {
  // Auth gate: requires signed-in user (pre-RLS, but avoids fully-open endpoint)
  const sb = await supabaseServer();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const pc_org_id = (body.pc_org_id ?? "").toString().trim();
  const person_id = (body.person_id ?? "").toString().trim();
  const position_title = (body.position_title ?? "").toString().trim();
  const start_date = (body.start_date ?? "").toString().trim();
  const tech_id = (body.tech_id ?? null)?.toString().trim() || null;
  const notes = (body.notes ?? null)?.toString().trim() || null;

  if (!pc_org_id) {
    return NextResponse.json({ ok: false, error: "Missing required field: pc_org_id" }, { status: 400 });
  }
  if (!person_id) {
    return NextResponse.json({ ok: false, error: "Missing required field: person_id" }, { status: 400 });
  }
  if (!position_title) {
    return NextResponse.json({ ok: false, error: "Missing required field: position_title" }, { status: 400 });
  }
  if (!start_date) {
    return NextResponse.json({ ok: false, error: "Missing required field: start_date" }, { status: 400 });
  }

  const svc = getServiceClient();

  // Create assignment via RPC (enforces atomic rule & any downstream logging)
  const { data, error } = await svc.rpc("org_assign_person", {
    p_pc_org_id: pc_org_id,
    p_person_id: person_id,
    p_position_title: position_title,
    p_start_date: start_date,
    p_actor_user_id: userData.user.id,
    p_notes: notes ?? null,
  });

  if (error) {
    const msg = error.message || "RPC failed";
    const lower = msg.toLowerCase();
    const status =
      lower.includes("already has an active assignment") ||
      lower.includes("already has active assignment") ||
      lower.includes("person already has an active assignment")
        ? 409
        : lower.includes("unauthorized")
          ? 401
          : 500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  // Optional: update tech_id immediately after create
  const assignmentId =
    (data as any)?.assignment_id || (Array.isArray(data) ? (data[0] as any)?.assignment_id : null);

  if (tech_id && assignmentId) {
    const { error: upErr } = await svc.from("assignment").update({ tech_id }).eq("assignment_id", assignmentId);
    if (upErr) {
      // Non-fatal: assignment created successfully; return created assignment + warning
      return NextResponse.json({ ok: true, assignment: data, warning: upErr.message });
    }
  }

  return NextResponse.json({ ok: true, assignment: data });
}
