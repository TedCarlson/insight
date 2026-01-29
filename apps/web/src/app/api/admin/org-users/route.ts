// apps/web/src/app/api/admin/org-users/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OWNER_AUTH_USER_ID = "b327ee2e-fbf6-45f1-8cc5-a9c0e16ce514";

/**
 * Org-scoped user list for Edge Permissions Console.
 *
 * Goals:
 * - Return authenticated users that can be granted permissions (user_profile-backed).
 * - Keep org-relevant users at the top (eligible / already granted / selected org / org-scoped exec access).
 *
 * Security:
 * - MUST be gated by api.can_manage_pc_org_console(pc_org_id)
 *
 * Notes:
 * - person.emails exists (plural), not person.email.
 */

const UUID_RE = new RegExp(
  "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
  "i",
);
const EMAIL_SPLIT_RE = new RegExp("[,\\s;]+", "g");

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

  const parts = raw
    .split(EMAIL_SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean);
  const hit = parts.find((p) => p.includes("@"));
  return hit ?? (parts[0] ?? null);
}

function isItgSupervisorPlus(status: unknown): boolean {
  if (typeof status !== "string") return false;
  const s = status.toLowerCase();
  const isItg = s.includes("itg");
  const senior =
    s.includes("supervisor") ||
    s.includes("manager") ||
    s.includes("director") ||
    s.includes("vp") ||
    s.includes("vice") ||
    s.includes("chief") ||
    s.includes("president") ||
    s.includes("owner");
  return isItg && senior;
}

type UserHit = {
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;

  // optional UX flags
  eligible_for_org?: boolean;
  has_grant_in_org?: boolean;
  selected_org?: boolean;
  org_scoped_exec_access?: boolean;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pc_org_id = (url.searchParams.get("pc_org_id") ?? "").trim();
    const min_title = (url.searchParams.get("min_title") ?? "").trim();

    if (!pc_org_id || !isUuid(pc_org_id)) {
      return NextResponse.json({ ok: false, error: "missing_or_invalid_pc_org_id" }, { status: 400 });
    }

    const sb = await supabaseServer();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Gate access
    const { data: allowed, error: allowErr } = await (sb as any)
      .schema("api")
      .rpc("can_manage_pc_org_console", { p_pc_org_id: pc_org_id });

    if (allowErr) return NextResponse.json({ ok: false, error: allowErr.message }, { status: 500 });
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const admin = supabaseAdmin();

    // Exclude owners from dropdown targets
    const owners = await admin.from("app_owners").select("auth_user_id").limit(2000);
    const ownerIds = new Set<string>(
      (owners.data ?? []).map((r: any) => String(r.auth_user_id ?? "").trim()).filter(Boolean),
    );
    ownerIds.add(OWNER_AUTH_USER_ID);

    // --- org-scoped sets (for sorting / badging) ---
    const elig = await admin
      .from("user_pc_org_eligibility")
      .select("auth_user_id")
      .eq("pc_org_id", pc_org_id)
      .limit(500);
    if (elig.error) return NextResponse.json({ ok: false, error: elig.error.message }, { status: 500 });
    const eligibleIds = new Set<string>(
      (elig.data ?? []).map((r: any) => String(r.auth_user_id ?? "").trim()).filter(Boolean),
    );

    const grants = await admin
      .from("pc_org_permission_grant")
      .select("auth_user_id")
      .eq("pc_org_id", pc_org_id)
      .limit(2000);
    if (grants.error) return NextResponse.json({ ok: false, error: grants.error.message }, { status: 500 });
    const grantIds = new Set<string>(
      (grants.data ?? []).map((r: any) => String(r.auth_user_id ?? "").trim()).filter(Boolean),
    );

    // Optional widen: org-scoped exec access derived => leader_person_id -> user_profile.person_id -> auth_user_id
    const execScopedIds = new Set<string>();
    if (min_title === "itg_supervisor_plus") {
      const derived = await admin
        .from("exec_pc_org_access_derived")
        .select("leader_person_id")
        .eq("pc_org_id", pc_org_id)
        .limit(2000);

      if (!derived.error) {
        const leaderPersonIds = (derived.data ?? [])
          .map((r: any) => String(r.leader_person_id ?? "").trim())
          .filter(Boolean);

        if (leaderPersonIds.length) {
          const leaderProfiles = await admin
            .from("user_profile" as any)
            .select("auth_user_id,person_id,status")
            .in("person_id", leaderPersonIds)
            .limit(2000);

          if (!leaderProfiles.error) {
            for (const r of leaderProfiles.data ?? []) {
              const id = String((r as any).auth_user_id ?? "").trim();
              if (id) execScopedIds.add(id);
            }
          }
        }
      }
    }

    // --- base universe: authenticated users (user_profile-backed) ---
    // This keeps the console usable even when eligibility isn't populated yet.
    const prof = await admin
      .from("user_profile" as any)
      .select("auth_user_id,status,selected_pc_org_id,person:person_id(full_name,emails)")
      .not("auth_user_id", "is", null)
      .limit(2000);

    if (prof.error) return NextResponse.json({ ok: false, error: prof.error.message }, { status: 500 });

    const users: UserHit[] = (prof.data ?? [])
      .map((r: any) => {
        const auth_user_id = String(r.auth_user_id ?? "").trim();
        const status = r.status ?? null;
        const full_name = r.person?.full_name ?? null;
        const email = firstEmail(r.person?.emails);

        return {
          auth_user_id,
          status,
          full_name,
          email,
          eligible_for_org: eligibleIds.has(auth_user_id),
          has_grant_in_org: grantIds.has(auth_user_id),
          selected_org: String(r.selected_pc_org_id ?? "").trim() === pc_org_id,
          org_scoped_exec_access: execScopedIds.has(auth_user_id),
        };
      })
      .filter((u) => !!u.auth_user_id && !ownerIds.has(u.auth_user_id))
      .filter((u) => {
        // If requested, include ITG Supervisor+ users, but don't exclude others;
        // this mode just boosts who is "interesting" in the UI.
        if (min_title === "itg_supervisor_plus") {
          return u.eligible_for_org || u.org_scoped_exec_access || isItgSupervisorPlus(u.status) || u.has_grant_in_org || u.selected_org;
        }
        return true;
      })
      .sort((a, b) => {
        // Relevance first (grants/selected/eligible/exec), then name/email/id.
        const score = (u: UserHit) =>
          (u.has_grant_in_org ? 1000 : 0) +
          (u.selected_org ? 100 : 0) +
          (u.eligible_for_org ? 50 : 0) +
          (u.org_scoped_exec_access ? 10 : 0);

        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sb - sa;

        const A = (a.full_name ?? a.email ?? a.auth_user_id).toLowerCase();
        const B = (b.full_name ?? b.email ?? b.auth_user_id).toLowerCase();
        return A.localeCompare(B);
      });

    return NextResponse.json({ ok: true, users }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
