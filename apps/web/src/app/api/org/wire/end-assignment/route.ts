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
  assignment_id: string;
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

  const assignment_id = (body.assignment_id ?? "").trim();
  const notes = (body.notes ?? null)?.toString().trim() || null;

  if (!assignment_id) {
    return NextResponse.json({ ok: false, error: "Missing required field: assignment_id" }, { status: 400 });
  }

  const svc = getServiceClient();

  const { data, error } = await svc.rpc("org_end_assignment", {
    p_assignment_id: assignment_id,
    p_actor_user_id: userData.user.id,
    p_notes: notes,
  });

  if (error) {
    const msg = error.message || "RPC failed";
    const lower = msg.toLowerCase();
    const status =
      lower.includes("not found") ? 404 :
      lower.includes("unauthorized") ? 401 :
      500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  return NextResponse.json({ ok: true, assignment: data });
}
