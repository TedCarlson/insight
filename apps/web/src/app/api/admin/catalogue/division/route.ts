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
    .from("division")
    .select("division_id, division_name, division_code", { count: "exact" })
    .order("division_name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`division_name.ilike.%${q}%,division_code.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows =
    (data ?? []).map((r: any) => ({
      division_id: String(r.division_id),
      division_name: r.division_name ?? null,
      division_code: r.division_code ?? null,
    })) ?? [];

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
    const body = (await req.json()) as { division_name?: unknown; division_code?: unknown };
    const division_name = String(body.division_name ?? "").trim();
    const division_code = String(body.division_code ?? "").trim();

    if (!division_name) return NextResponse.json({ error: "division_name is required" }, { status: 400 });
    if (!division_code) return NextResponse.json({ error: "division_code is required" }, { status: 400 });

    const admin = supabaseAdmin();
    const { error } = await admin.from("division").insert({
      division_name,
      division_code,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}