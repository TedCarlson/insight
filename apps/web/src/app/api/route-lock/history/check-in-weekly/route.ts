import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { requireModule } from "@/shared/access/access";

export const runtime = "nodejs";

function asDateOnly(v: unknown) {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function asUuid(v: unknown) {
  const s = String(v ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
    ? s
    : null;
}

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeekSunday(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return toDateOnly(d);
}

function addDays(dateOnly: string, days: number) {
  const d = new Date(`${dateOnly}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

async function resolveSelectedPcOrg(req: NextRequest) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (!user || userErr) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const admin = supabaseAdmin();

  const { data: profile, error: profileErr } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    return { ok: false as const, status: 500, error: profileErr.message };
  }

  const pc_org_id = String(profile?.selected_pc_org_id ?? "").trim();
  if (!pc_org_id) {
    return { ok: false as const, status: 409, error: "no selected org" };
  }

  try {
    const pass = await requireAccessPass(req, pc_org_id);
    requireModule(pass, "route_lock");
    return { ok: true as const, pc_org_id };
  } catch (err: any) {
    const status = Number(err?.status ?? 500);
    if (status === 401) return { ok: false as const, status: 401, error: "unauthorized" };
    if (status === 403) return { ok: false as const, status: 403, error: "forbidden" };
    if (status === 400) {
      return {
        ok: false as const,
        status: 400,
        error: String(err?.message ?? "invalid_pc_org_id"),
      };
    }
    return { ok: false as const, status: 500, error: "access_error" };
  }
}

async function resolveAffiliationName(admin: ReturnType<typeof supabaseAdmin>, person_id: string | null) {
  if (!person_id) return null;

  const { data: personRow, error: personErr } = await admin
    .from("person")
    .select("person_id,co_ref_id,co_code")
    .eq("person_id", person_id)
    .maybeSingle();

  if (personErr || !personRow) return null;

  const co_ref_id = personRow.co_ref_id ? String(personRow.co_ref_id) : null;
  const co_code = personRow.co_code ? String(personRow.co_code) : null;

  if (co_ref_id) {
    const [{ data: company }, { data: contractor }] = await Promise.all([
      admin.from("company").select("company_name").eq("company_id", co_ref_id).maybeSingle(),
      admin.from("contractor").select("contractor_name").eq("contractor_id", co_ref_id).maybeSingle(),
    ]);

    if (company?.company_name) return String(company.company_name);
    if (contractor?.contractor_name) return String(contractor.contractor_name);
  }

  if (co_code) {
    const [{ data: companyByCode }, { data: contractorByCode }] = await Promise.all([
      admin.from("company").select("company_name").eq("company_code", co_code).maybeSingle(),
      admin.from("contractor").select("contractor_name").eq("contractor_code", co_code).maybeSingle(),
    ]);

    if (companyByCode?.company_name) return String(companyByCode.company_name);
    if (contractorByCode?.contractor_name) return String(contractorByCode.contractor_name);
  }

  return null;
}

export async function GET(req: NextRequest) {
  const guard = await resolveSelectedPcOrg(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const assignment_id = asUuid(req.nextUrl.searchParams.get("assignment_id"));
  const from = asDateOnly(req.nextUrl.searchParams.get("from"));
  const to = asDateOnly(req.nextUrl.searchParams.get("to"));

  if (!assignment_id) {
    return NextResponse.json({ ok: false, error: "Missing/invalid assignment_id" }, { status: 400 });
  }
  if (!from || !to) {
    return NextResponse.json({ ok: false, error: "Missing/invalid from/to date" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ ok: false, error: "from date cannot be after to date" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: techRow, error: techErr } = await admin
    .from("route_lock_roster_v")
    .select("assignment_id,person_id,tech_id,full_name,co_name")
    .eq("pc_org_id", guard.pc_org_id)
    .eq("assignment_id", assignment_id)
    .maybeSingle();

  if (techErr) {
    return NextResponse.json({ ok: false, error: techErr.message }, { status: 500 });
  }
  if (!techRow) {
    return NextResponse.json(
      { ok: false, error: "Technician assignment not found in selected org" },
      { status: 404 }
    );
  }

  const tech_id = String(techRow.tech_id ?? "").trim();
  if (!tech_id) {
    return NextResponse.json({ ok: false, error: "Selected tech has no tech_id" }, { status: 400 });
  }

  const person_id = techRow.person_id ? String(techRow.person_id) : null;
  const derivedAffiliation =
    (techRow.co_name ? String(techRow.co_name) : null) ??
    (await resolveAffiliationName(admin, person_id));

  const { data: factRows, error: factErr } = await admin
    .from("check_in_day_fact")
    .select("shift_date,actual_jobs,actual_units,actual_hours,tech_id")
    .eq("pc_org_id", guard.pc_org_id)
    .eq("tech_id", tech_id)
    .gte("shift_date", from)
    .lte("shift_date", to)
    .order("shift_date", { ascending: true });

  if (factErr) {
    return NextResponse.json({ ok: false, error: factErr.message }, { status: 500 });
  }

  const weekMap = new Map<
    string,
    {
      week_start: string;
      week_end: string;
      tech_id: string;
      full_name: string;
      affiliation: string | null;
      days_worked: number;
      worked_dates: string[];
      actual_jobs: number;
      actual_units: number;
      actual_hours: number;
    }
  >();

  for (const row of factRows ?? []) {
    const shift_date = String((row as any).shift_date ?? "").trim();
    if (!shift_date) continue;

    const week_start = startOfWeekSunday(shift_date);
    const week_end = addDays(week_start, 6);

    const key = week_start;
    const cur = weekMap.get(key) ?? {
      week_start,
      week_end,
      tech_id,
      full_name: String(techRow.full_name ?? ""),
      affiliation: derivedAffiliation,
      days_worked: 0,
      worked_dates: [],
      actual_jobs: 0,
      actual_units: 0,
      actual_hours: 0,
    };

    cur.days_worked += 1;
    cur.worked_dates.push(shift_date);
    cur.actual_jobs += Number((row as any).actual_jobs ?? 0) || 0;
    cur.actual_units += Number((row as any).actual_units ?? 0) || 0;
    cur.actual_hours += Number((row as any).actual_hours ?? 0) || 0;

    weekMap.set(key, cur);
  }

  const rows = Array.from(weekMap.values())
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map((row) => ({
      ...row,
      worked_dates_label: row.worked_dates.join(", "),
    }));

  return NextResponse.json({
    ok: true,
    tech: {
      assignment_id,
      tech_id,
      full_name: String(techRow.full_name ?? ""),
      affiliation: derivedAffiliation,
    },
    window: { from, to },
    rows,
  });
}