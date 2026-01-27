// apps/web/src/app/api/admin/org-users/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OWNER_AUTH_USER_ID = "b327ee2e-fbf6-45f1-8cc5-a9c0e16ce514";


/**
 * Org-scoped user list for Edge Permissions Console.
 *
 * Per project goals:
 * - No "typeahead search" on each keystroke.
 * - Return ALL eligible users for the org (typically small: < 20).
 *
 * Security:
 * - MUST be gated by api.can_manage_pc_org_console(pc_org_id)
 *
 * Schema:
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

  const parts = raw.split(EMAIL_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
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

    // Gate access using Step 3 function
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


    // Eligible users for this org (bounded but typically small)
    const elig = await admin
      .from("user_pc_org_eligibility")
      .select("auth_user_id")
      .eq("pc_org_id", pc_org_id)
      .limit(500);

    if (elig.error) return NextResponse.json({ ok: false, error: elig.error.message }, { status: 500 });

    const eligibleIds = (elig.data ?? [])
      .map((r: any) => String(r.auth_user_id ?? "").trim())
      .filter(Boolean);

    

// Optionally widen the dropdown to include org-scoped ITG Supervisor+ users,
// so management teams can manage grants locally.
let orgScopedIds: string[] = [];
if (min_title === "itg_supervisor_plus") {
  try {
    const scoped = await admin
      .from("exec_pc_org_access_derived")
      .select("auth_user_id")
      .eq("pc_org_id", pc_org_id)
      .limit(2000);

    if (!scoped.error) {
      orgScopedIds = (scoped.data ?? [])
        .map((r: any) => String(r.auth_user_id ?? "").trim())
        .filter(Boolean);
    }
  } catch {
    orgScopedIds = [];
  }
}

const candidateIds = Array.from(new Set([...eligibleIds, ...orgScopedIds]))
  .filter((id) => !!id && !ownerIds.has(id));
if (!candidateIds.length) {
      return NextResponse.json({ ok: true, users: [] satisfies UserHit[] }, { status: 200 });
    }

    const prof = await admin
      .from("user_profile" as any)
      .select("auth_user_id,status,person:person_id(full_name,emails)")
      .in("auth_user_id", candidateIds)
      .limit(500);

    if (prof.error) return NextResponse.json({ ok: false, error: prof.error.message }, { status: 500 });

    const users: UserHit[] = (prof.data ?? [])
      .map((r: any) => ({
        auth_user_id: String(r.auth_user_id ?? ""),
        status: r.status ?? null,
        full_name: r.person?.full_name ?? null,
        email: firstEmail(r.person?.emails),
      }))

.filter((u: UserHit) => {
  // Never include owners
  if (ownerIds.has(u.auth_user_id)) return false;

  // If requested, include ALL ITG Supervisor+ org-scoped users
  // plus the normal eligible list for the org.
  if (min_title === "itg_supervisor_plus") {
    const isEligible = eligibleIds.includes(u.auth_user_id);
    return isEligible || isItgSupervisorPlus(u.status);
  }

  return true;
})
.sort
((a: UserHit, b: UserHit) => {
        const A = (a.full_name ?? a.email ?? a.auth_user_id).toLowerCase();
        const B = (b.full_name ?? b.email ?? b.auth_user_id).toLowerCase();
        return A.localeCompare(B);
      });

    return NextResponse.json({ ok: true, users }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
