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
  reason_code?: string | null;
  notes?: string | null;
};

export async function POST(req: Request) {
  // Auth gate: requires signed-in user
  const sb = await supabaseServer();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const pc_org_id = (body.pc_org_id ?? "").trim();
  const person_id = (body.person_id ?? "").trim();
  const position_title = (body.position_title ?? "").trim();
  const start_date = (body.start_date ?? "").trim();
  const reason_code = (body.reason_code ?? null)?.toString().trim() || null;
  const notes = (body.notes ?? null)?.toString().trim() || null;

  if (!pc_org_id || !person_id || !position_title || !start_date) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: pc_org_id, person_id, position_title, start_date" },
      { status: 400 }
    );
  }

  const svc = getServiceClient();

  // Call transactional RPC: inserts assignment + logs org_event in same transaction
  const { data, error } = await svc.rpc("org_assign_person", {
    p_pc_org_id: pc_org_id,
    p_person_id: person_id,
    p_position_title: position_title,
    p_start_date: start_date,
    p_reason_code: reason_code,
    p_notes: notes,
    p_actor_user_id: userData.user.id,
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

  return NextResponse.json({ ok: true, assignment: data });
}
