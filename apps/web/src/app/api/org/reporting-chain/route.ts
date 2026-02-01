import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

type LeaderRow = {
  role_key?: string | null;
  leader_user_id: string | null;
  leader_person_id: string | null;
};

async function resolveAuthUserName(admin: any, auth_user_id: string): Promise<string> {
  // Prefer person name if linked
  try {
    const { data: prof } = await admin
      .from("user_profile")
      .select("person_id")
      .eq("auth_user_id", auth_user_id)
      .maybeSingle();

    const personId = prof?.person_id ? String(prof.person_id) : null;
    if (personId) {
      const { data: person } = await admin.from("person").select("full_name").eq("person_id", personId).maybeSingle();
      const nm = person?.full_name ? String(person.full_name) : null;
      if (nm) return nm;
    }
  } catch {
    // ignore
  }

  // Fallback to email
  try {
    const { data, error } = await admin.auth.admin.getUserById(auth_user_id);
    if (!error) return (data?.user?.email ?? auth_user_id) as string;
  } catch {
    // ignore
  }

  return auth_user_id;
}

async function resolveLeader(admin: any, row: any | null): Promise<{ id: string | null; label: string | null }> {
  if (!row) return { id: null, label: null };

  if (row.leader_person_id) {
    const pid = String(row.leader_person_id);
    const { data: person } = await admin.from("person").select("full_name").eq("person_id", pid).maybeSingle();
    const nm = person?.full_name ? String(person.full_name) : null;
    return { id: pid, label: nm ?? pid };
  }

  if (row.leader_user_id) {
    const uid = String(row.leader_user_id);
    const label = await resolveAuthUserName(admin, uid);
    return { id: uid, label };
  }

  return { id: null, label: null };
}

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) return NextResponse.json({ ok: false, error: "missing env" }, { status: 500 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // selected org (server truth)
  const { data: profile, error: profileErr } = await supabase
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });

  const pc_org_id = (profile?.selected_pc_org_id ?? null) as string | null;
  if (!pc_org_id) return NextResponse.json({ ok: false, error: "no selected org" }, { status: 409 });

  // Must be allowed to see this org (defense-in-depth)
  try {
    const apiClient: any = (supabase as any).schema ? (supabase as any).schema("api") : supabase;
    const { data: choices, error } = await apiClient.rpc("pc_org_choices");
    if (error) throw error;
    const ok = (choices ?? []).some((c: any) => String(c?.pc_org_id ?? c?.id ?? "").trim() === pc_org_id);
    if (!ok) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // Find region/division from pc_org
  const { data: po, error: poErr } = await admin
    .from("pc_org")
    .select("pc_org_id, region_id, division_id")
    .eq("pc_org_id", pc_org_id)
    .maybeSingle();

  if (poErr) return NextResponse.json({ ok: false, error: poErr.message }, { status: 500 });
  if (!po) return NextResponse.json({ ok: false, error: "pc_org not found" }, { status: 404 });

  const region_id = (po.region_id ?? null) as string | null;
  const division_id = (po.division_id ?? null) as string | null;

  // Role priority rules
  const pcLeadRoleKeys = ["pc_manager", "regional_manager"];
  const regionDirectorRoleKeys = ["regional_director", "director"];

  async function fetchPcLeadRow() {
    for (const rk of pcLeadRoleKeys) {
      const { data } = await admin
        .from("pc_org_leadership")
        .select("role_key, leader_user_id, leader_person_id")
        .eq("pc_org_id", pc_org_id)
        .eq("role_key", rk)
        .eq("is_primary", true)
        .maybeSingle();
      if (data) return data;
    }
    return null;
  }

  async function fetchRegionDirectorRow(regionId: string | null) {
    if (!regionId) return null;
    for (const rk of regionDirectorRoleKeys) {
      const { data } = await admin
        .from("region_leadership")
        .select("role_key, leader_user_id, leader_person_id")
        .eq("region_id", regionId)
        .eq("role_key", rk)
        .eq("is_primary", true)
        .maybeSingle();
      if (data) return data;
    }
    return null;
  }

  const [pcLeadRow, directorRow, vpRow] = await Promise.all([
    fetchPcLeadRow(),
    fetchRegionDirectorRow(region_id),
    division_id
  ? admin
      .from("division_leadership")
      .select("role_key, leader_user_id, leader_person_id")
      .eq("division_id", division_id)
      .eq("role_key", "vp")
      .eq("is_primary", true)
      .maybeSingle()
      .then((r) => r.data ?? null)
  : Promise.resolve(null),
  ]);

  const pc_lead = await resolveLeader(admin, pcLeadRow);
  const director = await resolveLeader(admin, directorRow);
  const vp = await resolveLeader(admin, vpRow);

  return NextResponse.json({
    ok: true,
    pc_org_id,
    region_id,
    division_id,
    chain: {
      vp: { ...vp, role_key: vpRow?.role_key ?? "vp" },
      director: { ...director, role_key: directorRow?.role_key ?? null },
      pc_lead: { ...pc_lead, role_key: pcLeadRow?.role_key ?? null },
    },
  });
}