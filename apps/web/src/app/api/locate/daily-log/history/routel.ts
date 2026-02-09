import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const SORT_ALLOWLIST = new Set([
  "log_date",
  "state_name",
  "state_code",
  "updated_at",
]);

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env" },
      { status: 500 }
    );
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

  // -----------------------------
  // Parse query params
  // -----------------------------
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const pageSizeRaw = Number(sp.get("page_size") ?? DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(
    Math.max(1, pageSizeRaw),
    MAX_PAGE_SIZE
  );

  const sort = sp.get("sort") ?? "log_date";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";
  const q = (sp.get("q") ?? "").trim();
  const onlySaved = sp.get("only_saved") === "1";

  if (!SORT_ALLOWLIST.has(sort)) {
    return NextResponse.json(
      { ok: false, error: `Invalid sort column: ${sort}` },
      { status: 400 }
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // -----------------------------
  // Build query
  // -----------------------------
  let query = supabase
    .from("locate_daily_log") // <-- IMPORTANT: table name
    .select(
      `
      log_date,
      state_code,
      state_name,
      manpower_count,
      tickets_received_am,
      tickets_closed_pm,
      project_tickets,
      emergency_tickets,
      updated_at
    `,
      { count: "exact" }
    )
    .order(sort, { ascending: dir === "asc" })
    .range(from, to);

  // iLike search (state_name OR state_code)
  if (q) {
    query = query.or(
      `state_name.ilike.%${q}%,state_code.ilike.%${q}%`
    );
  }

  // Optional: only rows that were actually submitted (non-zero / non-null)
  if (onlySaved) {
    query = query.or(
      `
      manpower_count.gt.0,
      tickets_received_am.gt.0,
      tickets_closed_pm.gt.0,
      project_tickets.gt.0,
      emergency_tickets.gt.0
    `
    );
  }

  // -----------------------------
  // Execute
  // -----------------------------
  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    rows: data ?? [],
    total: count ?? 0,
  });
}