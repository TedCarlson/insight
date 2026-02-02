import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

async function getIsOwner(supabase: any): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("is_owner");
    return !!data;
  } catch {
    return false;
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    return NextResponse.json({ ok: false, error: "missing env" }, { status: 500 });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    return NextResponse.json({ ok: false, error: "missing env" }, { status: 500 });
  }

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

  const selected_pc_org_id: string | null =
    incoming === null || incoming === undefined || incoming === "" ? null : String(incoming);

  if (selected_pc_org_id !== null && !isUuid(selected_pc_org_id)) {
    return NextResponse.json({ ok: false, error: "invalid selected_pc_org_id" }, { status: 400 });
  }

  const isOwner = await getIsOwner(supabase);

  // If non-owner and setting an org, ensure the user can actually access it (prevents privilege escalation)
  if (!isOwner && selected_pc_org_id) {
    try {
      const apiClient: any = (supabase as any).schema ? (supabase as any).schema("api") : supabase;
      const { data: choices, error: choicesErr } = await apiClient.rpc("pc_org_choices");
      if (choicesErr) {
        return NextResponse.json({ ok: false, error: choicesErr.message }, { status: 500 });
      }

      const ok = (choices ?? []).some((o: any) => String(o?.pc_org_id ?? "").trim() === selected_pc_org_id);
      if (!ok) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  // Service role upsert prevents RLS + duplicate-key drift
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("user_profile")
    .upsert(
      {
        auth_user_id: user.id,
        selected_pc_org_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id" }
    )
    .select("auth_user_id, selected_pc_org_id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...data });
}