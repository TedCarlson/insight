// apps/web/src/app/api/session/status/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = await supabaseServer();

  const { data: userData, error: userErr } = await sb.auth.getUser();
  const user = userData?.user ?? null;

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Owner bypass
  let isOwner = false;
  try {
    const { data } = await sb.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }
  if (isOwner) {
    return NextResponse.json({ signedIn: true, active: true, isOwner: true }, { status: 200 });
  }

  // Active check
  let status: string | null = null;
  try {
    const { data: profile } = await sb
      .from("user_profile")
      .select("status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    status = (profile as any)?.status ?? null;
  } catch {
    status = null;
  }

  const active = status === "active";
  return NextResponse.json({ signedIn: true, active, isOwner: false }, { status: 200 });
}
