// apps/web/src/app/api/locate/state-resource/update/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  state_code: string;
  default_manpower: number;
  backlog_seed: number;
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/**
 * Phase 1: allow any signed-in user to update Locate baselines.
 * Uses service-role to avoid RLS surprises while incubating Locate.
 */
export async function POST(req: NextRequest) {
  const sb = await supabaseServer();

  const { data: userData, error: userErr } = await sb.auth.getUser();
  const user = userData?.user ?? null;
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const state_code = String(body.state_code ?? "").trim().toUpperCase();
  if (!state_code) return NextResponse.json({ ok: false, error: "missing_state_code" }, { status: 400 });

  const default_manpower = Math.max(0, n(body.default_manpower));
  const backlog_seed = Math.max(0, n(body.backlog_seed));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !service) {
    return NextResponse.json({ ok: false, error: "missing_service_env" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, service, { auth: { persistSession: false } });

  const { error } = await admin
    .from("locate_state_resource")
    .update({
      default_manpower,
      backlog_seed,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("state_code", state_code);

  if (error) {
    return NextResponse.json({ ok: false, error: "update_failed", details: error }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}