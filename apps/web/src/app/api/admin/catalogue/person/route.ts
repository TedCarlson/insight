import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

function num(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  // signed-in gate (keeps service role behind auth)
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const pageIndex = Math.max(0, num(url.searchParams.get("pageIndex"), 0));
  const pageSizeRaw = num(url.searchParams.get("pageSize"), 25);
  const pageSize = Math.min(100, Math.max(5, pageSizeRaw));

  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  // service-role query (RLS-safe once you re-enable policies)
  const admin = supabaseAdmin();

  // NOTE: We’re intentionally conservative about search fields.
  // Expand once you confirm exact columns you want searchable.
  let query = admin
    .from("person")
    .select(
      "person_id, full_name, emails, mobile, fuse_emp_id, person_nt_login, active, role",
      { count: "exact" }
    )
    .order("full_name", { ascending: true })
    .range(from, to);

  if (q) {
    // ilike OR across a few common columns
    // (Supabase: or() takes a comma-separated filter string)
    const esc = q.replace(/,/g, ""); // defensive
    query = query.or(
      [
        `full_name.ilike.%${esc}%`,
        `emails.ilike.%${esc}%`,
        `mobile.ilike.%${esc}%`,
        `fuse_emp_id.ilike.%${esc}%`,
        `person_nt_login.ilike.%${esc}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: data ?? [],
    page: { pageIndex, pageSize, totalRows: count ?? undefined },
  });
}   