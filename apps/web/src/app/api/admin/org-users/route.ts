// apps/web/src/app/api/admin/org-users/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

    if (!eligibleIds.length) {
      return NextResponse.json({ ok: true, users: [] satisfies UserHit[] }, { status: 200 });
    }

    const prof = await admin
      .from("user_profile" as any)
      .select("auth_user_id,status,person:person_id(full_name,emails)")
      .in("auth_user_id", eligibleIds)
      .limit(500);

    if (prof.error) return NextResponse.json({ ok: false, error: prof.error.message }, { status: 500 });

    const users: UserHit[] = (prof.data ?? [])
      .map((r: any) => ({
        auth_user_id: String(r.auth_user_id ?? ""),
        status: r.status ?? null,
        full_name: r.person?.full_name ?? null,
        email: firstEmail(r.person?.emails),
      }))
      .sort((a: UserHit, b: UserHit) => {
        const A = (a.full_name ?? a.email ?? a.auth_user_id).toLowerCase();
        const B = (b.full_name ?? b.email ?? b.auth_user_id).toLowerCase();
        return A.localeCompare(B);
      });

    return NextResponse.json({ ok: true, users }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
