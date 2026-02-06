// apps/web/src/app/api/profile/select-org/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

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
  const sb = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let admin: any;
  try {
    admin = supabaseAdmin();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "service_client_unavailable", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }

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
  const sb = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

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

  const isOwner = await getIsOwner(sb);

  // If non-owner and setting an org, ensure the user can actually access it (prevents privilege escalation)
  if (!isOwner && selected_pc_org_id) {
    try {
      const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;
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

  let admin: any;
  try {
    admin = supabaseAdmin();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "service_client_unavailable", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }

  // Service role upsert prevents RLS + duplicate-key drift
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