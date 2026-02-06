// apps/web/src/app/api/admin/org-people-inventory/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

/**
 * Org-scoped "people inventory" for Org Users console:
 * - person
 * - person_pc_org counts
 * - assignment counts
 * - leadership edges (assignment_reporting) counts
 * - invite status (auth.users: invited_at / last_sign_in_at) for linked users via user_profile
 *
 * Security:
 * - MUST be gated by api.can_manage_pc_org_console(pc_org_id)
 *
 * Notes:
 * - Uses service-role on the server to read auth metadata.
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
      // ignore
    }
  }

  const parts = raw.split(EMAIL_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  const hit = parts.find((p) => p.includes("@"));
  return hit ?? (parts[0] ?? null);
}

type InviteStatus = "not_invited" | "invited_pending" | "active";

type Row = {
  person_id: string;
  full_name: string | null;
  email: string | null;
  person_active: boolean | null;

  pc_org_rows: number;
  pc_org_active_rows: number;

  assignment_rows: number;
  assignment_active_rows: number;

  leadership_edges: number;

  auth_user_id: string | null;
  profile_status: string | null;

  invite_status: InviteStatus;
  invited_at: string | null;
  last_sign_in_at: string | null;

  can_delete: boolean;
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pc_org_id = (url.searchParams.get("pc_org_id") ?? "").trim();

    if (!pc_org_id || !isUuid(pc_org_id)) {
      return NextResponse.json({ ok: false, error: "missing_or_invalid_pc_org_id" }, { status: 400 });
    }

    // Auth + org-console gate
    const sb = await supabaseServer();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { data: allowed, error: allowErr } = await (sb as any)
      .schema("api")
      .rpc("can_manage_pc_org_console", { p_pc_org_id: pc_org_id });

    if (allowErr) return NextResponse.json({ ok: false, error: allowErr.message }, { status: 500 });
    if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const admin = supabaseAdmin();

    // "People pool" for this org = membership OR assignment
    const [ppoRes, asgRes] = await Promise.all([
      admin
        .from("person_pc_org" as any)
        .select("person_id,active,end_date")
        .eq("pc_org_id", pc_org_id)
        .limit(5000),
      admin
        .from("assignment" as any)
        .select("assignment_id,person_id,active,end_date")
        .eq("pc_org_id", pc_org_id)
        .limit(5000),
    ]);

    if (ppoRes.error) return NextResponse.json({ ok: false, error: ppoRes.error.message }, { status: 500 });
    if (asgRes.error) return NextResponse.json({ ok: false, error: asgRes.error.message }, { status: 500 });

    const ppo = (ppoRes.data ?? []) as any[];
    const asg = (asgRes.data ?? []) as any[];

    const personIds = Array.from(
      new Set([...ppo.map((r) => String(r.person_id)), ...asg.map((r) => String(r.person_id))].filter(Boolean)),
    );

    if (!personIds.length) {
      return NextResponse.json({ ok: true, rows: [] satisfies Row[] }, { status: 200 });
    }

    const [peopleRes, profRes] = await Promise.all([
      admin
        .from("person" as any)
        .select("person_id,full_name,emails,active")
        .in("person_id", personIds)
        .limit(5000),
      admin
        .from("user_profile" as any)
        .select("person_id,auth_user_id,status")
        .in("person_id", personIds)
        .limit(5000),
    ]);

    if (peopleRes.error) return NextResponse.json({ ok: false, error: peopleRes.error.message }, { status: 500 });
    if (profRes.error) return NextResponse.json({ ok: false, error: profRes.error.message }, { status: 500 });

    const today = new Date().toISOString().slice(0, 10);

    // membership counts
    const ppoCounts = new Map<string, { total: number; active: number }>();
    for (const r of ppo) {
      const pid = String(r.person_id);
      const cur = ppoCounts.get(pid) ?? { total: 0, active: 0 };
      cur.total += 1;
      const active = r.active === true && (!r.end_date || String(r.end_date) >= today);
      if (active) cur.active += 1;
      ppoCounts.set(pid, cur);
    }

    // assignment counts + mapping assignment -> person
    const asgCounts = new Map<string, { total: number; active: number }>();
    const personByAssignment = new Map<string, string>();

    for (const r of asg) {
      const pid = String(r.person_id);
      const cur = asgCounts.get(pid) ?? { total: 0, active: 0 };
      cur.total += 1;
      const active = (r.active === true || r.active == null) && (!r.end_date || String(r.end_date) >= today);
      if (active) cur.active += 1;
      asgCounts.set(pid, cur);

      if (r?.assignment_id) personByAssignment.set(String(r.assignment_id), pid);
    }

    // leadership edges count via assignment_reporting
    const leadershipEdgesByPerson = new Map<string, number>();
    const assignmentIds = asg.map((r) => String(r.assignment_id)).filter(Boolean);

    if (assignmentIds.length) {
      const chunkSize = 200;
      for (let i = 0; i < assignmentIds.length; i += chunkSize) {
        const chunk = assignmentIds.slice(i, i + chunkSize);
        const or = `child_assignment_id.in.(${chunk.join(",")}),parent_assignment_id.in.(${chunk.join(",")})`;

        const arRes = await admin
          .from("assignment_reporting" as any)
          .select("child_assignment_id,parent_assignment_id")
          .or(or)
          .limit(10000);

        if (arRes.error) return NextResponse.json({ ok: false, error: arRes.error.message }, { status: 500 });

        for (const e of (arRes.data ?? []) as any[]) {
          const c = e?.child_assignment_id ? String(e.child_assignment_id) : null;
          const p = e?.parent_assignment_id ? String(e.parent_assignment_id) : null;

          if (c) {
            const pid = personByAssignment.get(c);
            if (pid) leadershipEdgesByPerson.set(pid, (leadershipEdgesByPerson.get(pid) ?? 0) + 1);
          }
          if (p) {
            const pid = personByAssignment.get(p);
            if (pid) leadershipEdgesByPerson.set(pid, (leadershipEdgesByPerson.get(pid) ?? 0) + 1);
          }
        }
      }
    }

    // person -> profile
    const profileByPerson = new Map<string, { auth_user_id: string; status: string | null }>();
    for (const r of (profRes.data ?? []) as any[]) {
      if (r?.person_id && r?.auth_user_id) {
        profileByPerson.set(String(r.person_id), { auth_user_id: String(r.auth_user_id), status: r.status ?? null });
      }
    }

    // auth metadata for linked users
    const authIds = Array.from(new Set(Array.from(profileByPerson.values()).map((v) => v.auth_user_id)));
    const authById = new Map<string, { invited_at: string | null; last_sign_in_at: string | null }>();

    await mapLimit(authIds, 10, async (id) => {
      const res = await admin.auth.admin.getUserById(id);
      if (res.error || !res.data?.user) {
        authById.set(id, { invited_at: null, last_sign_in_at: null });
        return null as any;
      }
      const u: any = res.data.user;
      authById.set(id, { invited_at: u.invited_at ?? null, last_sign_in_at: u.last_sign_in_at ?? null });
      return null as any;
    });

    const rows: Row[] = (peopleRes.data ?? []).map((p: any) => {
      const pid = String(p.person_id);
      const prof = profileByPerson.get(pid) ?? null;
      const auth = prof?.auth_user_id
        ? (authById.get(prof.auth_user_id) ?? { invited_at: null, last_sign_in_at: null })
        : { invited_at: null, last_sign_in_at: null };

      const invite_status: InviteStatus =
        !prof?.auth_user_id ? "not_invited" : auth.last_sign_in_at ? "active" : "invited_pending";

      const ppoC = ppoCounts.get(pid) ?? { total: 0, active: 0 };
      const asgC = asgCounts.get(pid) ?? { total: 0, active: 0 };
      const lead = leadershipEdgesByPerson.get(pid) ?? 0;

      return {
        person_id: pid,
        full_name: p.full_name ?? null,
        email: firstEmail(p.emails),
        person_active: p.active ?? null,

        pc_org_rows: ppoC.total,
        pc_org_active_rows: ppoC.active,

        assignment_rows: asgC.total,
        assignment_active_rows: asgC.active,

        leadership_edges: lead,

        auth_user_id: prof?.auth_user_id ?? null,
        profile_status: prof?.status ?? null,

        invite_status,
        invited_at: auth.invited_at,
        last_sign_in_at: auth.last_sign_in_at,

        can_delete: ppoC.total === 0 && asgC.total === 0 && lead === 0,
      };
    });

    rows.sort((a, b) => {
      if (a.can_delete !== b.can_delete) return a.can_delete ? -1 : 1;
      const A = (a.full_name ?? a.email ?? a.person_id).toLowerCase();
      const B = (b.full_name ?? b.email ?? b.person_id).toLowerCase();
      return A.localeCompare(B);
    });

    return NextResponse.json({ ok: true, rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
