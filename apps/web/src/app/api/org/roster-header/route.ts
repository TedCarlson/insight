import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function asUuid(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return null;
  return s;
}

type LeaderRow = {
  role_key?: string | null;
  leader_user_id: string | null;
  leader_person_id: string | null;
};

function firstEmailFromUnknown(emails: any): string | null {
  if (!emails) return null;
  if (typeof emails === "string") return emails;
  if (Array.isArray(emails)) return typeof emails[0] === "string" ? emails[0] : null;
  try {
    const s = JSON.stringify(emails);
    return s.length ? s : null;
  } catch {
    return null;
  }
}

async function resolveLeaderLabel(admin: any, row: LeaderRow | null): Promise<string | null> {
  if (!row) return null;

  const leader_user_id = row.leader_user_id ? String(row.leader_user_id) : null;
  const leader_person_id = row.leader_person_id ? String(row.leader_person_id) : null;

  if (leader_user_id) {
    // 1) Prefer user_profile -> person full_name (human-readable)
    try {
      const { data: prof } = await admin
        .from("user_profile")
        .select("person_id")
        .eq("auth_user_id", leader_user_id)
        .maybeSingle();

      const personId = prof?.person_id ? String(prof.person_id) : null;

      if (personId) {
        const { data: person } = await admin
          .from("person")
          .select("full_name, emails")
          .eq("person_id", personId)
          .maybeSingle();

        const nm = person?.full_name ? String(person.full_name) : null;
        if (nm) return nm;
      }
    } catch {
      // ignore; fallback below
    }

    // 2) Fallback to auth email
    try {
      const { data, error } = await admin.auth.admin.getUserById(leader_user_id);
      if (!error) {
        const email = (data?.user?.email ?? null) as string | null;
        return email ?? leader_user_id;
      }
    } catch {
      // ignore
    }

    return leader_user_id;
  }

  if (leader_person_id) {
    const { data, error } = await admin
      .from("person")
      .select("full_name, emails")
      .eq("person_id", leader_person_id)
      .maybeSingle();

    if (!error) {
      const name = (data?.full_name ?? null) as string | null;
      const email = firstEmailFromUnknown(data?.emails);
      return name ?? email ?? leader_person_id;
    }
    return leader_person_id;
  }

  return null;
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) return NextResponse.json({ ok: false, error: "missing env" }, { status: 500 });
  if (!service) return NextResponse.json({ ok: false, error: "missing service role key" }, { status: 500 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pc_org_id = asUuid(body?.pc_org_id);
  if (!pc_org_id) return NextResponse.json({ ok: false, error: "invalid pc_org_id" }, { status: 400 });

  // Server-authoritative scope
  const { data: profile, error: profileErr } = await supabase
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });

  const selected_pc_org_id = (profile?.selected_pc_org_id ?? null) as string | null;
  if (!selected_pc_org_id) return NextResponse.json({ ok: false, error: "no selected org" }, { status: 409 });

  // Owner?
  let isOwner = false;
  try {
    const { data } = await supabase.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }

  // Non-owner: must match selected org
  if (!isOwner && pc_org_id !== selected_pc_org_id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // Service role client for joins + Auth Admin API resolution
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Org meta from pc_org + mso/division/region
  const { data: po, error: poErr } = await admin
    .from("pc_org")
    .select("pc_org_id, mso_id, division_id, region_id")
    .eq("pc_org_id", pc_org_id)
    .maybeSingle();

  if (poErr) return NextResponse.json({ ok: false, error: poErr.message }, { status: 500 });
  if (!po) return NextResponse.json({ ok: false, error: "pc_org not found" }, { status: 404 });

  const mso_id = (po.mso_id ?? null) as string | null;
  const division_id = (po.division_id ?? null) as string | null;
  const region_id = (po.region_id ?? null) as string | null;

  const [{ data: mso }, { data: div }, { data: reg }] = await Promise.all([
    mso_id ? admin.from("mso").select("mso_name").eq("mso_id", mso_id).maybeSingle() : Promise.resolve({ data: null as any }),
    division_id ? admin.from("division").select("division_name").eq("division_id", division_id).maybeSingle() : Promise.resolve({ data: null as any }),
    region_id ? admin.from("region").select("region_name").eq("region_id", region_id).maybeSingle() : Promise.resolve({ data: null as any }),
  ]);

  // 2) Leadership chain (primary only) with priority rules
  const pcLeadRoleKeys = ["pc_manager", "regional_manager"];
  const regionDirectorRoleKeys = ["regional_director", "director"];

  async function fetchPcLeadRow(): Promise<LeaderRow | null> {
    for (const rk of pcLeadRoleKeys) {
      const { data } = await admin
        .from("pc_org_leadership")
        .select("role_key, leader_user_id, leader_person_id")
        .eq("pc_org_id", pc_org_id)
        .eq("role_key", rk)
        .eq("is_primary", true)
        .maybeSingle();
      if (data) return data as any;
    }
    return null;
  }

  async function fetchRegionDirectorRow(regionId: string | null): Promise<LeaderRow | null> {
    if (!regionId) return null;
    for (const rk of regionDirectorRoleKeys) {
      const { data } = await admin
        .from("region_leadership")
        .select("role_key, leader_user_id, leader_person_id")
        .eq("region_id", regionId)
        .eq("role_key", rk)
        .eq("is_primary", true)
        .maybeSingle();
      if (data) return data as any;
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
          .then((r) => (r.data ?? null) as any)
      : Promise.resolve(null),
  ]);

  const [pc_lead_label, director_label, vp_label] = await Promise.all([
    resolveLeaderLabel(admin, pcLeadRow),
    resolveLeaderLabel(admin, directorRow),
    resolveLeaderLabel(admin, vpRow),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      mso_name: (mso?.mso_name ?? null) as string | null,
      division_name: (div?.division_name ?? null) as string | null,
      region_name: (reg?.region_name ?? null) as string | null,

      // New chain fields
      pc_lead_label,
      pc_lead_role_key: (pcLeadRow?.role_key ?? null) as string | null,

      director_label,
      director_role_key: (directorRow?.role_key ?? null) as string | null,

      vp_label,
      vp_role_key: ((vpRow as any)?.role_key ?? "vp") as string | null,

      // Keep old fields for compatibility if any UI still expects them
      // (manager_label used to exist; keep it mapped to pc_lead_label temporarily)
      manager_label: pc_lead_label,

      debug: {
        pc_org_id,
        region_id,
        division_id,
        pc_lead_source: pcLeadRow ?? null,
        director_source: directorRow ?? null,
        vp_source: vpRow ?? null,
      },
    },
  });
}