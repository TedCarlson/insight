import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function num(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const pageIndex = Math.max(0, num(url.searchParams.get("pageIndex"), 0));
  const pageSizeRaw = num(url.searchParams.get("pageSize"), 25);
  const pageSize = Math.min(100, Math.max(5, pageSizeRaw));

  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  const admin = supabaseAdmin();

  let query = admin
    .from("pc")
    .select(
      `
      pc_id,
      pc_number
      `,
      { count: "exact" }
    )
    .order("pc_number", { ascending: true })
    .range(from, to);

  // PC search: only meaningful as numeric
  if (q && /^[0-9]+$/.test(q)) {
    query = query.eq("pc_number", Number(q));
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r: any) => ({
    pc_id: r.pc_id,
    pc_number: r.pc_number,
  }));

  return NextResponse.json({
    rows,
    page: { pageIndex, pageSize, totalRows: count ?? undefined },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const pc_number = Number(body.pc_number);

    if (!Number.isInteger(pc_number)) {
      return NextResponse.json({ error: "pc_number must be an integer" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("pc")
      .insert({ pc_number })
      .select("pc_id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, pc_id: data?.pc_id ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}