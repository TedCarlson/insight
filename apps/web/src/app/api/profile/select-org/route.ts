import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function isUuid(v: string) {
  // UUID v1–v5
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_profile")
    .select("auth_user_id, selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    auth_user_id: user.id,
    selected_pc_org_id: data?.selected_pc_org_id ?? null,
  });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const incoming = body?.selected_pc_org_id;

  // allow setting to null (clearing selection)
  const selected_pc_org_id: string | null =
    incoming === null || incoming === undefined || incoming === "" ? null : String(incoming);

  if (selected_pc_org_id !== null && !isUuid(selected_pc_org_id)) {
    return NextResponse.json({ ok: false, error: "invalid selected_pc_org_id" }, { status: 400 });
  }

  // Update if profile exists
  const { data: updated, error: updateErr } = await supabase
    .from("user_profile")
    .update({ selected_pc_org_id })
    .eq("auth_user_id", user.id)
    .select("auth_user_id, selected_pc_org_id")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  // If no row existed (unexpected, but safe), create it
  if (!updated) {
    const { data: inserted, error: insertErr } = await supabase
      .from("user_profile")
      .insert({
        auth_user_id: user.id,
        selected_pc_org_id,
        status: "pending",
      })
      .select("auth_user_id, selected_pc_org_id")
      .single();

    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...inserted, created: true });
  }

  return NextResponse.json({ ok: true, ...updated, created: false });
}
