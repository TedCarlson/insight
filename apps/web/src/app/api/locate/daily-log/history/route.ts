import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const SORT_ALLOWLIST = new Set(["log_date", "state_name", "state_code", "updated_at"] as const);
type SortKey = (typeof SORT_ALLOWLIST extends Set<infer T> ? T : never) & string;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* noop */
      },
    },
  });

  // Auth gate (RLS relies on this)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const pageSize = clamp(Number(sp.get("page_size") ?? DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);

  const sort = (sp.get("sort") ?? "log_date") as SortKey;
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";
  const q = (sp.get("q") ?? "").trim();
  const onlySaved = sp.get("only_saved") === "1";

  if (!SORT_ALLOWLIST.has(sort as any)) {
    return NextResponse.json({ ok: false, error: `Invalid sort column: ${sort}` }, { status: 400 });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  /**
   * ✅ IMPORTANT:
   * Use the same relation your Daily Log feature uses for viewing rows.
   * In your codebase this is typically:
   * - locate_daily_call_log_v (view)
   * - locate_daily_call_log (table)
   *
   * For history listing, prefer the view.
   */
  let query = supabase
    .from("locate_daily_call_log_v")
    .select(
      "log_date,state_code,state_name,manpower_count,tickets_received_am,tickets_closed_pm,project_tickets,emergency_tickets,updated_at",
      { count: "exact" }
    )
    .order(sort, { ascending: dir === "asc" })
    .range(from, to);

  // iLike search (state_name OR state_code)
  if (q) {
    query = query.or(`state_name.ilike.%${q}%,state_code.ilike.%${q}%`);
  }

  // "Saved only" => has any meaningful submitted value
  if (onlySaved) {
    query = query.or(
      "manpower_count.gt.0,tickets_received_am.gt.0,tickets_closed_pm.gt.0,project_tickets.gt.0,emergency_tickets.gt.0"
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rows: data ?? [],
    total: count ?? 0,
  });
}