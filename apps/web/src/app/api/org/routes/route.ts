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


export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const pc_org_id = url.searchParams.get("pc_org_id");
  if (!pc_org_id) {
    return NextResponse.json({ ok: false, error: "Missing pc_org_id" }, { status: 400 });
  }

  const svc = getServiceClient();
  const { data, error } = await svc
    .from("route")
    .select("route_id, route_name, pc_org_id")
    .eq("pc_org_id", pc_org_id)
    .order("route_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, routes: data ?? [] });
}
