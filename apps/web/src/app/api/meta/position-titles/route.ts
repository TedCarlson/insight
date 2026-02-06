import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

export async function GET() {
  // Auth gate: must be signed in (pre-RLS but not publicly open)
  const sb = await supabaseServer();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const svc = supabaseAdmin();

  const { data, error } = await svc
    .from("position_title")
    .select("position_title, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("position_title", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, titles: data ?? [] });
}