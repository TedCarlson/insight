// apps/web/src/app/api/admin/me/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sb = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // api.is_app_owner() is an INVOKER function in your DB (uses auth.uid()).
  // So call it with the session client (not service role).
  const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;
  const { data: isOwner, error: ownErr } = await apiClient.rpc("is_app_owner");

  if (ownErr) {
    return NextResponse.json({ ok: false, error: ownErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    auth_user_id: user.id,
    is_owner: !!isOwner,
  });
}