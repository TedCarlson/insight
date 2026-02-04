import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = await supabaseServer();

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Owner-only for now (you said you’ll set the launch admin as owner too)
  let isOwner = false;
  try {
    const { data } = await sb.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }
  if (!isOwner) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const { data, error } = await sb
    .from("locate_state_resource")
    .select("state_code,state_name,default_manpower,backlog_seed,is_active")
    .eq("is_active", true)
    .order("state_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "state_resource_fetch_failed", details: error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, states: data ?? [] }, { status: 200 });
}