import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { hasCapability } from "@/shared/access/access";
import { CAP } from "@/shared/access/capabilities";

export const runtime = "nodejs";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function sanitizeSearch(raw: string) {
  // Prevent PostgREST parser weirdness: commas/parens are logic-tree breakers.
  return raw.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function isActiveWindow(row: any, today: string) {
  const activeOk = row?.active === true || row?.active == null;
  const startOk = !row?.start_date || String(row.start_date) <= today;
  const endOk = !row?.end_date || String(row.end_date) >= today;
  return activeOk && startOk && endOk;
}

function pickBestTechId(assignments: any[], today: string): string | null {
  if (!assignments?.length) return null;

  // Prefer current windowed assignment, else most recent by start_date.
  const current = assignments.filter((a) => isActiveWindow(a, today) && a?.tech_id);
  const pool = current.length ? current : assignments.filter((a) => a?.tech_id);

  pool.sort((a, b) => String(b?.start_date ?? "").localeCompare(String(a?.start_date ?? "")));
  const best = pool[0]?.tech_id ? String(pool[0].tech_id).trim() : "";
  return best ? best : null;
}

/**
 * ✅ ORG-SCOPED person search for Tech Scorecard mirror
 * Path:
 *  selected pc_org_id
 *   -> (person_pc_org OR assignment) = "people pool"
 *   -> filter by (person.full_name OR person.emails OR assignment.tech_id)
 */
export async function GET(req: NextRequest) {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) return json(401, { ok: false, error: "unauthorized" });

  const sb = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user) return json(401, { ok: false, error: "unauthorized" });

  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  const q = qRaw ? sanitizeSearch(qRaw) : "";

  if (!q) return json(200, { ok: true, rows: [] });

  const pc_org_id = scope.selected_pc_org_id;

  // Gate: owner OR has any of these perms (mirror is a leader tool)
  let pass: any;
  try {
    pass = await requireAccessPass(req, pc_org_id);
  } catch (err: any) {
    if (err?.status === 401) return json(401, { ok: false, error: "unauthorized" });
    if (err?.status === 403) return json(403, { ok: false, error: "forbidden" });
    if (err?.status === 400) return json(400, { ok: false, error: err?.message ?? "invalid_pc_org_id" });
    return json(500, { ok: false, error: "access_pass_failed" });
  }

  const isOwner = Boolean(pass?.is_app_owner) || Boolean(pass?.is_owner);
  if (!isOwner) {
    const allowed =
      hasCapability(pass, CAP.METRICS_MANAGE) ||
      hasCapability(pass, CAP.ROSTER_MANAGE);

    if (!allowed) return json(403, { ok: false, error: "forbidden" });
  }

  const admin = supabaseAdmin();
  const today = isoToday();

  // 1) Build "people pool" for this org = membership OR assignment
  const [ppoRes, asgPoolRes] = await Promise.all([
    admin.from("person_pc_org" as any).select("person_id").eq("pc_org_id", pc_org_id).limit(5000),
    admin.from("assignment" as any).select("person_id").eq("pc_org_id", pc_org_id).limit(5000),
  ]);

  if (ppoRes.error) return json(500, { ok: false, error: ppoRes.error.message });
  if (asgPoolRes.error) return json(500, { ok: false, error: asgPoolRes.error.message });

  const poolIds = new Set<string>(
    [...(ppoRes.data ?? []), ...(asgPoolRes.data ?? [])]
      .map((r: any) => String(r?.person_id ?? "").trim())
      .filter(Boolean),
  );

  if (!poolIds.size) return json(200, { ok: true, rows: [] });

  // 2) Find matches by name/email (person table)
  const peopleMatchRes = await admin
    .from("person" as any)
    .select("person_id,full_name,emails")
    .or(`full_name.ilike.%${q}%,emails.ilike.%${q}%`)
    .limit(50);

  if (peopleMatchRes.error) return json(500, { ok: false, error: peopleMatchRes.error.message });

  const peopleMatches = (peopleMatchRes.data ?? []) as any[];
  const peopleMatchIds = new Set<string>(
    peopleMatches.map((r) => String(r?.person_id ?? "").trim()).filter(Boolean),
  );

  // 3) Find matches by tech_id (assignment table scoped to org)
  const asgMatchRes = await admin
    .from("assignment" as any)
    .select("person_id,tech_id,start_date,end_date,active")
    .eq("pc_org_id", pc_org_id)
    .ilike("tech_id", `%${q}%`)
    .limit(100);

  if (asgMatchRes.error) return json(500, { ok: false, error: asgMatchRes.error.message });

  const asgMatches = (asgMatchRes.data ?? []) as any[];
  const asgMatchIds = new Set<string>(
    asgMatches.map((r) => String(r?.person_id ?? "").trim()).filter(Boolean),
  );

  // 4) Union matches, then intersect with poolIds (org-scoped truth)
  const candidateIds = Array.from(new Set<string>([...peopleMatchIds, ...asgMatchIds])).filter((pid) => poolIds.has(pid));

  if (!candidateIds.length) return json(200, { ok: true, rows: [] });

  // 5) Load person rows for candidates
  const peopleRes = await admin
    .from("person" as any)
    .select("person_id,full_name,emails")
    .in("person_id", candidateIds)
    .limit(100);

  if (peopleRes.error) return json(500, { ok: false, error: peopleRes.error.message });

  // 6) Load assignments for candidates to choose best tech_id (windowed)
  const asgRes = await admin
    .from("assignment" as any)
    .select("person_id,tech_id,start_date,end_date,active")
    .eq("pc_org_id", pc_org_id)
    .in("person_id", candidateIds)
    .limit(1000);

  if (asgRes.error) return json(500, { ok: false, error: asgRes.error.message });

  const asgByPerson = new Map<string, any[]>();
  for (const a of (asgRes.data ?? []) as any[]) {
    const pid = String(a?.person_id ?? "").trim();
    if (!pid) continue;
    const arr = asgByPerson.get(pid) ?? [];
    arr.push(a);
    asgByPerson.set(pid, arr);
  }

  const rows = ((peopleRes.data ?? []) as any[])
    .map((p) => {
      const pid = String(p?.person_id ?? "").trim();
      const tech_id = pickBestTechId(asgByPerson.get(pid) ?? [], today);
      return {
        person_id: pid,
        full_name: p?.full_name ? String(p.full_name) : null,
        emails: p?.emails ? String(p.emails) : null,
        tech_id,
      };
    })
    .sort((a, b) => String(a.full_name ?? "").localeCompare(String(b.full_name ?? "")))
    .slice(0, 25);

  return json(200, { ok: true, rows });
}