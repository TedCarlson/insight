import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function num(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function strOrNull(v: unknown) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function sanitizeSearch(raw: string) {
  // Prevent PostgREST logic-tree parse issues from commas/parens.
  // Keep it simple: remove known breaker chars.
  return raw.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  // signed-in gate
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  const q = qRaw ? sanitizeSearch(qRaw) : "";
  const pageIndex = Math.max(0, num(url.searchParams.get("pageIndex"), 0));
  const pageSizeRaw = num(url.searchParams.get("pageSize"), 25);
  const pageSize = Math.min(100, Math.max(5, pageSizeRaw));

  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  const admin = supabaseAdmin();

  const select = `
    assignment_id,
    person_id,
    pc_org_id,
    office_id,
    tech_id,
    start_date,
    end_date,
    position_title,
    active,

    person:person_id (
      person_id,
      full_name
    ),

    pc_org:pc_org_id (
      pc_org_id,
      pc_org_name
    ),

    office:office_id (
      office_id,
      office_name
    )
  `;

  let query = admin
    .from("assignment")
    .select(select, { count: "exact" })
    .order("start_date", { ascending: false })
    .range(from, to);

  if (q) {
    // ---- Phase 1: find matching FK IDs via ilike on related tables ----
    // Safety caps; admin search only.
    const limitIds = 500;

    const [peopleRes, pcOrgRes, officeRes] = await Promise.all([
      admin.from("person").select("person_id").ilike("full_name", `%${q}%`).limit(limitIds),
      admin.from("pc_org").select("pc_org_id").ilike("pc_org_name", `%${q}%`).limit(limitIds),
      admin.from("office").select("office_id").ilike("office_name", `%${q}%`).limit(limitIds),
    ]);

    const personIds =
      (peopleRes.data ?? [])
        .map((r: any) => String(r.person_id ?? "").trim())
        .filter(Boolean) ?? [];

    const pcOrgIds =
      (pcOrgRes.data ?? [])
        .map((r: any) => String(r.pc_org_id ?? "").trim())
        .filter(Boolean) ?? [];

    const officeIds =
      (officeRes.data ?? [])
        .map((r: any) => String(r.office_id ?? "").trim())
        .filter(Boolean) ?? [];

    // ---- Phase 2: one OR scope on base table only ----
    // This gives true "scan scope": ANY match includes row.
    const orParts: string[] = [];

    if (personIds.length) orParts.push(`person_id.in.(${personIds.join(",")})`);
    if (pcOrgIds.length) orParts.push(`pc_org_id.in.(${pcOrgIds.join(",")})`);
    if (officeIds.length) orParts.push(`office_id.in.(${officeIds.join(",")})`);

    // Base-table ilike fallbacks
    orParts.push(`tech_id.ilike.%${q}%`);
    orParts.push(`position_title.ilike.%${q}%`);

    query = query.or(orParts.join(","));
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows =
    (data ?? []).map((r: any) => ({
      assignment_id: r.assignment_id,
      person_id: r.person_id,
      pc_org_id: r.pc_org_id,
      office_id: r.office_id ?? null,

      tech_id: r.tech_id ?? null,
      start_date: r.start_date,
      end_date: r.end_date ?? null,
      position_title: r.position_title ?? null,
      active: r.active ?? true,

      person_full_name: r.person?.full_name ?? null,
      pc_org_name: r.pc_org?.pc_org_name ?? null,
      office_name: r.office?.office_name ?? null,
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
    const body = (await req.json()) as Record<string, unknown>;

    const person_id = strOrNull(body.person_id);
    const pc_org_id = strOrNull(body.pc_org_id);
    const start_date = strOrNull(body.start_date);

    if (!person_id) return NextResponse.json({ error: "person_id is required" }, { status: 400 });
    if (!pc_org_id) return NextResponse.json({ error: "pc_org_id is required" }, { status: 400 });
    if (!start_date) return NextResponse.json({ error: "start_date is required" }, { status: 400 });

    const insertRow = {
      person_id,
      pc_org_id,
      start_date,

      end_date: strOrNull(body.end_date),
      position_title: strOrNull(body.position_title),
      tech_id: strOrNull(body.tech_id),

      // NEW
      office_id: strOrNull(body.office_id),

      active: body.active == null ? true : Boolean(body.active),
    };

    const admin = supabaseAdmin();
    const { error } = await admin.from("assignment").insert(insertRow);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}