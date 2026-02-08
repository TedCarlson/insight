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
    .from("mso")
    .select(
      `
      mso_id,
      mso_name,
      mso_lob
    `,
      { count: "exact" }
    )
    .order("mso_name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`mso_name.ilike.%${q}%,mso_lob.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows =
    (data ?? []).map((r: any) => ({
      mso_id: r.mso_id,
      mso_name: r.mso_name ?? null,
      mso_lob: r.mso_lob ?? null,
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
    const body = (await req.json()) as { mso_name?: unknown; mso_lob?: unknown };

    const mso_name = String(body.mso_name ?? "").trim();
    const mso_lob = String(body.mso_lob ?? "").trim().toUpperCase();

    if (!mso_name) return NextResponse.json({ error: "mso_name is required" }, { status: 400 });
    if (!mso_lob) return NextResponse.json({ error: "mso_lob is required" }, { status: 400 });

    const admin = supabaseAdmin();

    const { error } = await admin.from("mso").insert({
      mso_name,
      mso_lob,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}