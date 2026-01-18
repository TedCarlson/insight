import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE service env");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  // Auth gate: requires signed-in user (pre-RLS, but avoids fully-open endpoint)
  const sb = await supabaseServer();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = searchParams.get("limit") ?? "25";
  const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 25, 100));

  const svc = getServiceClient();

  const { data, error } = await svc.rpc("people_global_unassigned_search", {
    p_query: q,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: "If the function doesn't exist, run supabase/sql/people_global_unassigned_search.sql in Supabase SQL editor.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, people: data ?? [] });
}
