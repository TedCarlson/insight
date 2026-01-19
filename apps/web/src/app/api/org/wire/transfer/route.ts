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
  from_assignment_id: string;
  to_pc_org_id: string;
  position_title: string;
  start_date: string; // YYYY-MM-DD
  notes?: string | null;
};

export async function POST(req: Request) {
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

  const from_assignment_id = (body.from_assignment_id ?? "").trim();
  const to_pc_org_id = (body.to_pc_org_id ?? "").trim();
  const position_title = (body.position_title ?? "").trim();
  const start_date = (body.start_date ?? "").trim();
  const notes = (body.notes ?? null)?.toString().trim() || null;

  if (!from_assignment_id || !to_pc_org_id || !position_title || !start_date) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: from_assignment_id, to_pc_org_id, position_title, start_date" },
      { status: 400 }
    );
  }

  const svc = getServiceClient();

  const { data, error } = await svc.rpc("org_transfer_person", {
    p_from_assignment_id: from_assignment_id,
    p_to_pc_org_id: to_pc_org_id,
    p_position_title: position_title,
    p_start_date: start_date,
    p_actor_user_id: userData.user.id,
    p_notes: notes,
  });

  if (error) {
    const msg = error.message || "RPC failed";
    const lower = msg.toLowerCase();
    const status =
      lower.includes("not found") ? 404 :
      lower.includes("not active") ? 409 :
      lower.includes("unauthorized") ? 401 :
      500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  return NextResponse.json({ ok: true, assignment: data });
}
