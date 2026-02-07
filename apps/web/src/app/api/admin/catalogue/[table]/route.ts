import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function num(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ table: string }> }
) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Next build expects params to be a Promise in this project setup
  const { table } = await context.params;

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, num(url.searchParams.get("limit"), 50)));

  const admin = supabaseAdmin();
  const { data, error } = await admin.from(table).select("*").limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const first = (data ?? [])[0] ?? {};
  const columns = Object.keys(first).map((k) => ({
    key: k,
    label: k,
    type: typeof (first as any)[k],
    editable: true,
    readonlyReason: undefined as string | undefined,
  }));

  return NextResponse.json({ columns, rows: data ?? [] });
}