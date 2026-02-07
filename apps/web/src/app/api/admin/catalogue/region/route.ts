import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function num(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  // signed-in gate (service role remains server-only)
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
    .from("region")
    .select(
      `
      region_id,
      region_name,
      region_code
    `,
      { count: "exact" }
    )
    .order("region_name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`region_name.ilike.%${q}%,region_code.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows =
    (data ?? []).map((r: any) => ({
      region_id: r.region_id,
      region_name: r.region_name ?? null,
      region_code: r.region_code ?? null,
    })) ?? [];

  return NextResponse.json({
    rows,
    page: { pageIndex, pageSize, totalRows: count ?? undefined },
  });
}

export async function POST(req: NextRequest) {
  // signed-in gate
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { region_name?: unknown; region_code?: unknown };
    const region_name = String(body.region_name ?? "").trim();
    const region_code = String(body.region_code ?? "").trim();

    if (!region_name) return NextResponse.json({ error: "region_name is required" }, { status: 400 });
    if (!region_code) return NextResponse.json({ error: "region_code is required" }, { status: 400 });

    const admin = supabaseAdmin();

    const { error } = await admin.from("region").insert({
      region_name,
      region_code,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}