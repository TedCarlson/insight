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
    .from("office")
    .select(
      `
      office_id,
      office_name,
      address,
      sub_region
      `,
      { count: "exact" }
    )
    .order("office_name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`office_name.ilike.%${q}%,sub_region.ilike.%${q}%,address.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r: any) => ({
    office_id: r.office_id,
    office_name: r.office_name,
    address: r.address ?? null,
    sub_region: r.sub_region ?? null,
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
    const office_name = String(body.office_name ?? "").trim();
    const addressRaw = String(body.address ?? "").trim();
    const subRegionRaw = String(body.sub_region ?? "").trim();

    if (!office_name) return NextResponse.json({ error: "office_name is required" }, { status: 400 });

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("office")
      .insert({
        office_name,
        address: addressRaw ? addressRaw : null,
        sub_region: subRegionRaw ? subRegionRaw : null,
      })
      .select("office_id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, office_id: data?.office_id ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}