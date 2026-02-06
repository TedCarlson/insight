import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export async function GET() {
  const sb = await supabaseServer();

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Owner-only
  let isOwner = false;
  try {
    const { data } = await sb.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }
  if (!isOwner) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !service) {
    return NextResponse.json({ ok: false, error: "missing_service_env" }, { status: 500 });
  }

  // Service role bypasses RLS (owner-gated route, OK for phase 1)
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("locate_state_resource")
    .select("state_code,state_name,default_manpower,backlog_seed,is_active")
    .eq("is_active", true)
    .order("state_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "state_resource_fetch_failed", details: error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, states: data ?? [], count: (data ?? []).length }, { status: 200 });
}