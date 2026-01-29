// apps/web/src/app/api/admin/org-users/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const UUID_RE = new RegExp(
  "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
  "i",
);

const EMAIL_SPLIT_RE = new RegExp("[,\s;]+", "g");

function isUuid(v: string) {
  return UUID_RE.test(v);
}

function firstEmail(emails: unknown): string | null {
  if (!emails) return null;

  if (Array.isArray(emails)) {
    for (const x of emails) {
      if (typeof x === "string" && x.includes("@")) return x.trim();
    }
    return null;
  }

  if (typeof emails !== "string") return null;

  const raw = emails.trim();
  if (!raw) return null;

  // JSON array in a string: '["a@b.com","c@d.com"]'
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      const hit = firstEmail(parsed);
      if (hit) return hit;
    } catch {
      // ignore and fall through
    }
  }

  const parts = raw.split(EMAIL_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  const hit = parts.find((p) => p.includes("@"));
  return hit ?? (parts[0] ?? null);
}

type UserHit = {
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  selected_org: boolean;
  eligible_for_org: boolean;
  has_grant_in_org: boolean;
  org_scoped_exec_access: boolean;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pc_org_id = (url.searchParams.get("pc_org_id") ?? "").trim();

    if (!pc_org_id || !isUuid(pc_org_id)) {
      return NextResponse.json({ ok: false, error: "missing_or_invalid_pc_org_id" }, { status: 400 });
    }

    // Caller must be authenticated
    const sb = await supabaseServer();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Gate: only org-console managers (or owners via that function) can view this list
    const { data: allowed, error: allowErr } = await (sb as any)
      .schema("api")
      .rpc("can_manage_pc_org_console", { p_pc_org_id: pc_org_id });

    if (allowErr) {
      return NextResponse.json({ ok: false, error: allowErr.message }, { status: 500 });
    }
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const admin = supabaseAdmin();

    // Owners should not appear as grant targets in the console.
    const ownersRes = await admin.from("app_owners").select("auth_user_id").limit(5000);
    if (ownersRes.error) {
      return NextResponse.json({ ok: false, error: ownersRes.error.message }, { status: 500 });
    }
    const ownerIds = new Set<string>(
      (ownersRes.data ?? []).map((r: any) => String(r.auth_user_id ?? "").trim()).filter(Boolean),
    );

    // Base universe: ALL authenticated users (user_profile rows).
    const profilesRes = await admin
      .from("user_profile")
      .select("auth_user_id, person_id, selected_pc_org_id")
      .not("auth_user_id", "is", null)
      .limit(5000);

    if (profilesRes.error) {
      return NextResponse.json({ ok: false, error: profilesRes.error.message }, { status: 500 });
    }

    const profiles = (profilesRes.data ?? [])
      .map((r: any) => ({
        auth_user_id: String(r.auth_user_id ?? "").trim(),
        person_id: r.person_id ? String(r.person_id).trim() : null,
        selected_pc_org_id: r.selected_pc_org_id ? String(r.selected_pc_org_id).trim() : null,
      }))
      .filter((r) => r.auth_user_id && !ownerIds.has(r.auth_user_id));

    const authUserIds = profiles.map((p) => p.auth_user_id);
    const personIds = profiles.map((p) => p.person_id).filter(Boolean) as string[];

    // Pull person display info (best-effort; some users may not have person links yet)
    let personById = new Map<string, { full_name: string | null; email: string | null; status: string | null }>();
    if (personIds.length > 0) {
      const personsRes = await admin
        .from("person")
        .select("person_id, full_name, emails, role")
        .in("person_id", personIds.slice(0, 1000)); // safety cap; increase later if needed

      if (personsRes.error) {
        return NextResponse.json({ ok: false, error: personsRes.error.message }, { status: 500 });
      }

      for (const p of personsRes.data ?? []) {
        const id = String((p as any).person_id ?? "").trim();
        if (!id) continue;
        personById.set(id, {
          full_name: (p as any).full_name ?? null,
          email: firstEmail((p as any).emails),
          status: (p as any).role ?? null,
        });
      }
    }

    // Flags: eligible for this org
    const eligRes = await admin
      .from("user_pc_org_eligibility")
      .select("auth_user_id")
      .eq("pc_org_id", pc_org_id)
      .in("auth_user_id", authUserIds.length ? authUserIds : ["00000000-0000-0000-0000-000000000000"])
      .limit(5000);

    if (eligRes.error) {
      return NextResponse.json({ ok: false, error: eligRes.error.message }, { status: 500 });
    }
    const eligibleSet = new Set<string>((eligRes.data ?? []).map((r: any) => String(r.auth_user_id ?? "").trim()).filter(Boolean));

    // Flags: has any grants in this org
    const grantsRes = await admin
      .from("pc_org_permission_grant")
      .select("auth_user_id")
      .eq("pc_org_id", pc_org_id)
      .in("auth_user_id", authUserIds.length ? authUserIds : ["00000000-0000-0000-0000-000000000000"])
      .limit(5000);

    if (grantsRes.error) {
      return NextResponse.json({ ok: false, error: grantsRes.error.message }, { status: 500 });
    }
    const grantSet = new Set<string>((grantsRes.data ?? []).map((r: any) => String(r.auth_user_id ?? "").trim()).filter(Boolean));

    // Flags: org-scoped exec derived access (optional best-effort)
    const execSet = new Set<string>();
    // We only can mark this when a profile is linked to a person_id
    if (personIds.length > 0) {
      const execRes = await admin
        .from("exec_pc_org_access_derived")
        .select("leader_person_id")
        .eq("pc_org_id", pc_org_id)
        .limit(5000);

      // If table doesn't exist / errors, treat as empty
      if (!execRes.error) {
        const execPersonIds = new Set<string>((execRes.data ?? []).map((r: any) => String((r as any).leader_person_id ?? "").trim()).filter(Boolean));
        for (const pr of profiles) {
          if (pr.person_id && execPersonIds.has(pr.person_id)) execSet.add(pr.auth_user_id);
        }
      }
    }

    const users: UserHit[] = profiles.map((pr) => {
      const person = pr.person_id ? personById.get(pr.person_id) : undefined;
      return {
        auth_user_id: pr.auth_user_id,
        full_name: person?.full_name ?? null,
        email: person?.email ?? null,
        status: person?.status ?? null,
        selected_org: pr.selected_pc_org_id === pc_org_id,
        eligible_for_org: eligibleSet.has(pr.auth_user_id),
        has_grant_in_org: grantSet.has(pr.auth_user_id),
        org_scoped_exec_access: execSet.has(pr.auth_user_id),
      };
    });

    // Sort org-relevant first, then by name/email
    users.sort((a, b) => {
      const key = (u: UserHit) =>
        (u.has_grant_in_org ? 8 : 0) +
        (u.selected_org ? 4 : 0) +
        (u.eligible_for_org ? 2 : 0) +
        (u.org_scoped_exec_access ? 1 : 0);

      const ka = key(a);
      const kb = key(b);
      if (ka !== kb) return kb - ka;

      const na = (a.full_name ?? a.email ?? a.auth_user_id).toLowerCase();
      const nb = (b.full_name ?? b.email ?? b.auth_user_id).toLowerCase();
      return na.localeCompare(nb);
    });

    return NextResponse.json({ ok: true, users }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "server_error" }, { status: 500 });
  }
}
