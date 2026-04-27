// path: apps/web/src/app/api/workforce/assignment/history/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export async function GET(req: Request) {
  const sb = await supabaseAdmin();

  const { searchParams } = new URL(req.url);
  const assignment_id = searchParams.get("assignment_id");

  if (!assignment_id) {
    return NextResponse.json(
      { error: "Missing assignment_id" },
      { status: 400 }
    );
  }

  const { data, error } = await sb.rpc("workforce_assignment_history", {
    p_assignment_id: assignment_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}