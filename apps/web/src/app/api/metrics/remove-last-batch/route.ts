// apps/web/src/api/metrics/remove-last-batch/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function POST() {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) return json(500, { ok: false, error: "missing env" });

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return json(401, { ok: false, error: "unauthorized" });

    const { data: prof, error: profErr } = await supabase
      .from("user_profile")
      .select("selected_pc_org_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profErr) return json(500, { ok: false, error: profErr.message });

    const pc_org_id = (prof?.selected_pc_org_id as string | null) ?? null;
    if (!pc_org_id) return json(400, { ok: false, error: "no org selected" });

    const { data: isOwner } = await supabase.rpc("is_owner");
    let hasRosterManage = false;

    if (!isOwner) {
      const apiClient: any = (supabase as any).schema ? (supabase as any).schema("api") : supabase;
      const { data } = await apiClient.rpc("has_pc_org_permission", {
        p_pc_org_id: pc_org_id,
        p_permission_key: "roster_manage",
      });
      hasRosterManage = Boolean(data);
      if (!hasRosterManage) return json(403, { ok: false, error: "forbidden" });
    }

    const { data: latest, error: latestErr } = await supabase
      .from("metrics_raw_batch")
      .select("batch_id, fiscal_end_date, status, uploaded_at, row_count")
      .eq("pc_org_id", pc_org_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) return json(500, { ok: false, error: latestErr.message });
    if (!latest?.batch_id) return json(200, { ok: true, deleted: false, message: "No batches found" });

    const batch_id = String(latest.batch_id);

    const { error: delErr } = await supabase.from("metrics_raw_batch").delete().eq("batch_id", batch_id);
    if (delErr) return json(500, { ok: false, error: delErr.message });

    return json(200, {
      ok: true,
      deleted: true,
      batch_id,
      fiscal_end_date: latest.fiscal_end_date,
      status: latest.status,
      row_count: latest.row_count,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message ?? e) });
  }
}