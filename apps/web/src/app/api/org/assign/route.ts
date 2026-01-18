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

  if (!pc_org_id || !person_id || !position_title || !start_date) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: pc_org_id, person_id, position_title, start_date" },
      { status: 400 }
    );
  }

  const svc = getServiceClient();

  const { data, error } = await svc
    .from("assignment")
    .insert({
      pc_org_id,
      person_id,
      position_title,
      start_date,
      end_date: null,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    const msg = error.message || "Insert failed";
    const lower = msg.toLowerCase();
    const status =
      lower.includes("duplicate") || lower.includes("unique") || lower.includes("already exists") ? 409 : 500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  return NextResponse.json({ ok: true, assignment: data });
}
