// apps/web/src/app/api/admin/leader-lookup/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

type LookupType = "user" | "person";

function cleanQuery(q: unknown) {
  const s = typeof q === "string" ? q.trim() : "";
  return s.slice(0, 80);
}

function cleanType(v: unknown): LookupType {
  return v === "person" ? "person" : "user";
}

function cleanLimit(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 12;
  return Math.max(1, Math.min(25, Math.floor(n)));
}

export async function POST(req: Request) {
  // Session-aware server client (cookie auth)
  const sb = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = cleanType(body?.type);
  const q = cleanQuery(body?.q);
  const limit = cleanLimit(body?.limit ?? 12);

  if (!q) return NextResponse.json({ ok: true, items: [] }, { status: 200 });

  // Server-authoritative org scope
  const { data: profile, error: profileErr } = await sb
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });

  const pc_org_id = (profile?.selected_pc_org_id as string | null) ?? null;
  if (!pc_org_id) return NextResponse.json({ ok: false, error: "no selected org" }, { status: 409 });

  // Permission gate: leadership_manage in selected org
  try {
    const apiClient: any = (sb as any).schema ? (sb as any).schema("api") : sb;
    const { data: allowed, error: permErr } = await apiClient.rpc("has_pc_org_permission", {
      p_pc_org_id: pc_org_id,
      p_permission_key: "leadership_manage",
    });
    if (permErr || !allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // Service role for lookups (auth.users not readable to anon)
  let admin: any;
  try {
    admin = supabaseAdmin();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "service_client_unavailable", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }

  if (type === "user") {
    // Global email search (auth.users)
    const { data, error } = await admin
      .schema("auth")
      .from("users")
      .select("id,email")
      .ilike("email", `%${q}%`)
      .order("email", { ascending: true })
      .limit(limit);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Map auth_user_id -> person full_name via user_profile.person_id
    const ids = (data ?? []).map((r: any) => r.id).filter(Boolean);

    const nameByUserId = new Map<string, string>();

    if (ids.length) {
      const { data: profiles, error: profErr } = await admin
        .from("user_profile")
        .select("auth_user_id, person_id")
        .in("auth_user_id", ids);

      if (!profErr && profiles?.length) {
        const personIds = profiles.map((p: any) => p.person_id).filter(Boolean);

        if (personIds.length) {
          const { data: people, error: pplErr } = await admin
            .from("person")
            .select("person_id, full_name")
            .in("person_id", personIds);

          if (!pplErr && people?.length) {
            const fullNameByPersonId = new Map<string, string>(
              people.map((p: any) => [String(p.person_id), String(p.full_name ?? "")])
            );

            for (const p of profiles) {
              const uid = String(p.auth_user_id);
              const pid = p.person_id ? String(p.person_id) : null;
              const nm = pid ? fullNameByPersonId.get(pid) : null;
              if (nm && nm.trim()) nameByUserId.set(uid, nm.trim());
            }
          }
        }
      }
    }

    const items = (data ?? []).map((r: any) => {
      const id = String(r.id);
      const email = String(r.email ?? "(no email)");
      const nm = nameByUserId.get(id);
      return {
        type: "user" as const,
        id,
        label: nm ? `${nm} — ${email}` : email,
        sublabel: id,
      };
    });

    return NextResponse.json({ ok: true, items }, { status: 200 });
  }

  // Person search (global): name/email-ish.
  // If emails isn't a text column, OR() can error; fallback to name-only.
  const base = admin.from("person").select("person_id, full_name, emails").limit(limit);

  const { data, error } = await base.or(`full_name.ilike.%${q}%,emails.ilike.%${q}%`);

  if (error) {
    const fallback = await admin
      .from("person")
      .select("person_id, full_name, emails")
      .ilike("full_name", `%${q}%`)
      .limit(limit);

    if (fallback.error) return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });

    const items = (fallback.data ?? []).map((r: any) => ({
      type: "person" as const,
      id: String(r.person_id),
      label: String(r.full_name ?? "(no name)"),
      sublabel: String(r.person_id),
      extra: r.emails ?? null,
    }));

    return NextResponse.json({ ok: true, items }, { status: 200 });
  }

  const items = (data ?? []).map((r: any) => ({
    type: "person" as const,
    id: String(r.person_id),
    label: String(r.full_name ?? "(no name)"),
    sublabel: String(r.person_id),
    extra: r.emails ?? null,
  }));

  return NextResponse.json({ ok: true, items }, { status: 200 });
}