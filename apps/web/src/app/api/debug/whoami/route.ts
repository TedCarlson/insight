// apps/web/src/app/api/debug/whoami/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  return NextResponse.json({
    auth_uid: user?.id ?? null,
  });
}