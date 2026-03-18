import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

import type { BandKey, ScorecardResponse, ScorecardTile } from "./scorecard.types";

type Args = {
  person_id: string;
};

type KpiCfg = {
  kpi_key: string;
  label: string | null;
  enabled: boolean;
  sort: number;
};

type RubricRow = {
  kpi_key: string;
  band_key: BandKey;
  min_value: number | null;
  max_value: number | null;
  score_value: number | null;
};

type OrgPill = {
  pc_org_id: string;
  label: string;
  tech_id: string | null;
  is_selected: boolean;
};

type HeaderHydrate = {
  affiliation: string | null;
  supervisor_name: string | null;
};

type KpiDefRow = {
  kpi_key: string | null;
  customer_label?: string | null;
  label?: string | null;
};

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

  const current = assignments.filter((a) => isActiveWindow(a, today) && a?.tech_id);
  const pool = current.length ? current : assignments.filter((a) => a?.tech_id);

  pool.sort((a, b) => String(b?.start_date ?? "").localeCompare(String(a?.start_date ?? "")));
  const best = pool[0]?.tech_id ? String(pool[0].tech_id).trim() : "";
  return best ? best : null;
}

function pickBestAssignmentId(assignments: any[], today: string): string | null {
  if (!assignments?.length) return null;

  const current = assignments.filter((a) => isActiveWindow(a, today) && a?.assignment_id);
  const pool = current.length ? current : assignments.filter((a) => a?.assignment_id);

  pool.sort((a, b) => String(b?.start_date ?? "").localeCompare(String(a?.start_date ?? "")));
  const best = pool[0]?.assignment_id ? String(pool[0].assignment_id).trim() : "";
  return best ? best : null;
}

function paintForBand(band: BandKey) {
  switch (band) {
    case "EXCEEDS":
      return { preset: "BAND_EXCEEDS", bg: "var(--to-surface-2)", border: "var(--to-success)", ink: null };
    case "MEETS":
      return { preset: "BAND_MEETS", bg: "var(--to-surface-2)", border: "var(--to-primary)", ink: null };
    case "NEEDS_IMPROVEMENT":
      return { preset: "BAND_NEEDS_IMPROVEMENT", bg: "var(--to-surface-2)", border: "var(--to-warning)", ink: null };
    case "MISSES":
      return { preset: "BAND_MISSES", bg: "var(--to-surface-2)", border: "var(--to-danger)", ink: null };
    default:
      return { preset: "BAND_NO_DATA", bg: "var(--to-surface-2)", border: "var(--to-border)", ink: null };
  }
}

function pickBand(value: number | null, bands: RubricRow[] | null | undefined): BandKey {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO_DATA";
  if (!bands || bands.length === 0) return "NO_DATA";

  for (const b of bands) {
    const minOk = b.min_value === null || value >= b.min_value;
    const maxOk = b.max_value === null || value <= b.max_value;
    if (minOk && maxOk) return b.band_key;
  }

  return "NO_DATA";
}

function numOrNull(x: any): number | null {
  const n = typeof x === "string" ? Number(x) : x;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function formatValueDisplay(kpiKey: string, value: number | null): string | null {
  if (value === null) return null;

  const lower = kpiKey.toLowerCase();
  const looksLikeRate =
    lower.endsWith("_rate") || lower.endsWith("_pct") || lower.includes("rate") || lower.includes("pct");

  if (looksLikeRate) {
    const pct = value <= 1.5 ? value * 100 : value;
    return `${pct.toFixed(pct >= 10 ? 0 : 1)}%`;
  }

  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function preferredLabel(classCfgRow: any, defRow: KpiDefRow | null | undefined, kpi_key: string): string {
  const classOverride =
    classCfgRow?.label != null && String(classCfgRow.label).trim()
      ? String(classCfgRow.label).trim()
      : null;

  const globalCustomer =
    defRow?.customer_label != null && String(defRow.customer_label).trim()
      ? String(defRow.customer_label).trim()
      : null;

  const globalLabel =
    defRow?.label != null && String(defRow.label).trim()
      ? String(defRow.label).trim()
      : null;

  return classOverride ?? globalCustomer ?? globalLabel ?? kpi_key;
}

async function loadTechKpiConfig(sbAdmin: any): Promise<KpiCfg[]> {
  const [{ data: classRows }, { data: defRows }] = await Promise.all([
    sbAdmin.from("metrics_class_kpi_config").select("*").eq("class_type", "TECH"),
    sbAdmin.from("metrics_kpi_def").select("kpi_key,customer_label,label"),
  ]);

  const defByKey = new Map<string, KpiDefRow>();
  for (const d of (defRows ?? []) as KpiDefRow[]) {
    const k = String(d?.kpi_key ?? "").trim();
    if (!k) continue;
    defByKey.set(k, d);
  }

  const rows = (classRows ?? []) as any[];

  const out: KpiCfg[] = rows
    .map((c) => {
      const kpi_key = String(c?.kpi_key ?? "").trim();
      if (!kpi_key) return null;

      const enabled = c.is_enabled ?? c.enabled ?? c.is_active ?? c.active ?? true;
      const show = c.show_in_report ?? c.show ?? true;

      if (!enabled || !show) return null;

      const label = preferredLabel(c, defByKey.get(kpi_key), kpi_key);
      const sort = c.sort_order ?? c.display_order ?? c.report_order ?? 999;

      return { kpi_key, label, enabled: true, sort };
    })
    .filter(Boolean) as KpiCfg[];

  out.sort((a, b) => a.sort - b.sort || a.kpi_key.localeCompare(b.kpi_key));
  return out;
}

async function loadRubricRows(sbAdmin: any, kpiKeys: string[]): Promise<Map<string, RubricRow[]>> {
  if (!kpiKeys.length) return new Map();

  const { data } = await sbAdmin
    .from("metrics_kpi_rubric")
    .select("kpi_key,band_key,min_value,max_value,score_value")
    .eq("is_active", true)
    .in("kpi_key", kpiKeys);

  const m = new Map<string, RubricRow[]>();

  for (const r of (data ?? []) as any[]) {
    const k = String(r.kpi_key);

    const row: RubricRow = {
      kpi_key: k,
      band_key: r.band_key,
      min_value: r.min_value,
      max_value: r.max_value,
      score_value: r.score_value,
    };

    const arr = m.get(k) ?? [];
    arr.push(row);
    m.set(k, arr);
  }

  return m;
}

/**
 * Canonical identity path:
 * person_id -> assignment (by pc_org) => tech_id
 * person_id -> person => full_name/emails
 */
async function resolveIdentityForOrg(person_id: string, pc_org_id: string) {
  const admin = supabaseAdmin();
  const today = isoToday();

  const [pRes, asgRes] = await Promise.all([
    admin.from("person").select("person_id,full_name,emails").eq("person_id", person_id).maybeSingle(),
    admin
      .from("assignment")
      .select("pc_org_id,assignment_id,tech_id,start_date,end_date,active")
      .eq("pc_org_id", pc_org_id)
      .eq("person_id", person_id)
      .limit(200),
  ]);

  const full_name = pRes?.data?.full_name ?? null;
  const emails = pRes?.data?.emails ?? null;

  const tech_id = pickBestTechId((asgRes.data ?? []) as any[], today);

  return { full_name, emails, tech_id };
}

async function loadPcOrgLabels(admin: any, pcOrgIds: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  if (!pcOrgIds.length) return m;

  const { data: orgs } = await admin.from("pc_org").select("pc_org_id,pc_org_name,pc_id").in("pc_org_id", pcOrgIds);

  const pcIds = Array.from(new Set((orgs ?? []).map((o: any) => o?.pc_id).filter(Boolean)));

  const pcNumById = new Map<string, string>();
  if (pcIds.length) {
    const { data: pcs } = await admin.from("pc").select("pc_id,pc_number").in("pc_id", pcIds);
    for (const p of pcs ?? []) {
      if (p?.pc_id && p?.pc_number != null) pcNumById.set(String(p.pc_id), String(p.pc_number));
    }
  }

  for (const o of orgs ?? []) {
    const id = String(o.pc_org_id);
    const name = o?.pc_org_name != null && String(o?.pc_org_name).trim() ? String(o.pc_org_name).trim() : null;
    const pcNum = o?.pc_id ? pcNumById.get(String(o.pc_id)) ?? null : null;

    m.set(id, name ?? pcNum ?? id);
  }

  for (const id of pcOrgIds) if (!m.has(id)) m.set(id, id);

  return m;
}

function fiscalMonthKeyFromEndDate(fiscal_end_date: string | null): string | null {
  if (!fiscal_end_date) return null;
  const s = String(fiscal_end_date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s.slice(0, 7);
}

async function buildOrgSelectorForPerson(args: {
  person_id: string;
  selected_pc_org_id: string;
}): Promise<{ org_selector: OrgPill[]; tech_id_for_selected: string | null }> {
  const admin = supabaseAdmin();
  const today = isoToday();

  const [asgRes, memRes] = await Promise.all([
    admin.from("assignment").select("pc_org_id,tech_id,start_date,end_date,active").eq("person_id", args.person_id).limit(500),
    admin.from("person_pc_org").select("pc_org_id,start_date,end_date,active").eq("person_id", args.person_id).limit(500),
  ]);

  const assignments = (asgRes.data ?? []) as any[];
  const memberships = (memRes.data ?? []) as any[];

  const pcOrgIds = new Set<string>();
  for (const a of assignments) if (a?.pc_org_id) pcOrgIds.add(String(a.pc_org_id));
  for (const m of memberships) if (m?.pc_org_id) pcOrgIds.add(String(m.pc_org_id));

  pcOrgIds.add(String(args.selected_pc_org_id));

  const ids = Array.from(pcOrgIds);
  const labels = await loadPcOrgLabels(admin, ids);

  const byOrg = new Map<string, any[]>();
  for (const a of assignments) {
    const id = a?.pc_org_id ? String(a.pc_org_id) : null;
    if (!id) continue;
    const arr = byOrg.get(id) ?? [];
    arr.push(a);
    byOrg.set(id, arr);
  }

  const pills: OrgPill[] = ids
    .map((pc_org_id) => {
      const label = labels.get(pc_org_id) ?? pc_org_id;
      const tech_id = pickBestTechId(byOrg.get(pc_org_id) ?? [], today);
      const is_selected = pc_org_id === String(args.selected_pc_org_id);
      return { pc_org_id, label, tech_id, is_selected };
    })
    .sort((a, b) => {
      if (a.is_selected && !b.is_selected) return -1;
      if (!a.is_selected && b.is_selected) return 1;
      return a.label.localeCompare(b.label);
    });

  const selected = pills.find((p) => p.is_selected) ?? null;

  return { org_selector: pills, tech_id_for_selected: selected?.tech_id ?? null };
}

function tilesNoData(kpiCfg: KpiCfg[]): ScorecardTile[] {
  return kpiCfg.map((k) => {
    const band_key: BandKey = "NO_DATA";
    return {
      kpi_key: k.kpi_key,
      label: k.label ?? k.kpi_key,
      value: null,
      value_display: null,
      band: { band_key, label: band_key.replaceAll("_", " "), paint: paintForBand(band_key) },
      momentum: {
        state: "NO_DATA",
        delta: null,
        delta_display: null,
        arrow: null,
        windows: { short_days: 7, long_days: 30 },
        notes: null,
      },
      context: null,
      drill: { trend_ranges: [30, 60, 90], default_range: 30 },
    };
  });
}

/**
 * Header hydration:
 * - affiliation: person.role + person.co_ref_id -> company_admin_v / contractor_admin_v
 * - supervisor: assignment_leadership_admin_v (child assignment -> parent assignment -> person.full_name)
 *
 * Strict: NEVER throw from here (we do not break metrics rendering)
 */
async function loadHeaderHydrateForPerson(args: {
  person_id: string;
  selected_pc_org_id: string;
}): Promise<HeaderHydrate> {
  const admin = supabaseAdmin();
  const today = isoToday();

  // 1) affiliation
  let affiliation: string | null = null;
  try {
    const { data: p } = await admin.from("person").select("role,co_ref_id").eq("person_id", args.person_id).maybeSingle();

    const role = p?.role != null ? String(p.role) : null;
    const co_ref_id = p?.co_ref_id != null ? String(p.co_ref_id) : null;

    if (role && co_ref_id) {
      if (role === "Hires") {
        const { data: co } = await admin
          .from("company_admin_v")
          .select("company_name")
          .eq("company_id", co_ref_id)
          .maybeSingle();
        affiliation = co?.company_name != null ? String(co.company_name) : null;
      } else if (role === "Contractors") {
        const { data: k } = await admin
          .from("contractor_admin_v")
          .select("contractor_name")
          .eq("contractor_id", co_ref_id)
          .maybeSingle();
        affiliation = k?.contractor_name != null ? String(k.contractor_name) : null;
      }
    }
  } catch {
    affiliation = null;
  }

  // 2) supervisor via leadership chain
  let supervisor_name: string | null = null;
  try {
    const { data: asgs } = await admin
      .from("assignment")
      .select("assignment_id,start_date,end_date,active")
      .eq("person_id", args.person_id)
      .eq("pc_org_id", args.selected_pc_org_id)
      .limit(200);

    const assignment_id = pickBestAssignmentId((asgs ?? []) as any[], today);
    if (assignment_id) {
      const { data: lead } = await admin
        .from("assignment_leadership_admin_v")
        .select("parent_assignment_id")
        .eq("child_assignment_id", assignment_id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      const parent_assignment_id = lead?.parent_assignment_id != null ? String(lead.parent_assignment_id) : null;

      if (parent_assignment_id) {
        const { data: parentAsg } = await admin
          .from("assignment")
          .select("person_id")
          .eq("assignment_id", parent_assignment_id)
          .maybeSingle();

        const supervisor_person_id = parentAsg?.person_id != null ? String(parentAsg.person_id) : null;

        if (supervisor_person_id) {
          const { data: sup } = await admin
            .from("person")
            .select("full_name")
            .eq("person_id", supervisor_person_id)
            .maybeSingle();

          supervisor_name = sup?.full_name != null ? String(sup.full_name) : null;
        }
      }
    }
  } catch {
    supervisor_name = null;
  }

  return { affiliation, supervisor_name };
}

export async function getTechScorecardPayload(args: Args): Promise<ScorecardResponse> {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) throw new Error("No org selected");

  const sb = await supabaseServer();
  const admin = supabaseAdmin();

  const pc_org_id = scope.selected_pc_org_id;

  // KPI config + rubric (GLOBAL rubric by KPI)
  const kpiCfg = await loadTechKpiConfig(admin);
  const kpiKeys = kpiCfg.map((k) => k.kpi_key);
  const rubricByKpi = await loadRubricRows(admin, kpiKeys);

  // Header identity (selected org)
  const ident = await resolveIdentityForOrg(args.person_id, pc_org_id);

  // Org pills (inclusive across history)
  const { org_selector, tech_id_for_selected } = await buildOrgSelectorForPerson({
    person_id: args.person_id,
    selected_pc_org_id: pc_org_id,
  });

  const selectedPill = org_selector.find((p) => p.is_selected) ?? null;

  // Header hydrate (affiliation + supervisor)
  const headerHydrate = await loadHeaderHydrateForPerson({
    person_id: args.person_id,
    selected_pc_org_id: pc_org_id,
  });

  const tech_id = tech_id_for_selected ?? ident.tech_id ?? null;

  if (!tech_id) {
    return {
      header: {
        person_id: args.person_id,
        full_name: ident.full_name,
        affiliation: headerHydrate.affiliation,
        supervisor_name: headerHydrate.supervisor_name,
        tech_id: null,
        pc_org_name: selectedPill?.label ?? null,
        fiscal_month_key: "—",
        fiscal_start_date: "—",
        fiscal_end_date: "—",
      },
      org_selector,
      tiles: tilesNoData(kpiCfg),
      rank: null,
    };
  }

  const { data: fact } = await sb
    .from("metrics_tech_fact_day")
    .select("*")
    .eq("pc_org_id", pc_org_id)
    .eq("tech_id", tech_id)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tiles: ScorecardTile[] = kpiCfg.map((k) => {
    const v = numOrNull((fact as any)?.[k.kpi_key]);
    const band_key = pickBand(v, rubricByKpi.get(k.kpi_key));

    return {
      kpi_key: k.kpi_key,
      label: k.label ?? k.kpi_key,
      value: v,
      value_display: formatValueDisplay(k.kpi_key, v),
      band: {
        band_key,
        label: band_key.replaceAll("_", " "),
        paint: paintForBand(band_key),
      },
      momentum: {
        state: "NO_DATA",
        delta: null,
        delta_display: null,
        arrow: null,
        windows: { short_days: 7, long_days: 30 },
        notes: null,
      },
      context: null,
      drill: { trend_ranges: [30, 60, 90], default_range: 30 },
    };
  });

  const fiscal_end_date = fact?.fiscal_end_date ? String(fact.fiscal_end_date).slice(0, 10) : "—";
  const fiscal_month_key = fiscalMonthKeyFromEndDate(fiscal_end_date) ?? "—";

  return {
    header: {
      person_id: args.person_id,
      full_name: ident.full_name,
      affiliation: headerHydrate.affiliation,
      supervisor_name: headerHydrate.supervisor_name,
      tech_id,
      pc_org_name: selectedPill?.label ?? null,
      fiscal_month_key,
      fiscal_start_date: "—", // we’ll wire fiscal_month_dim next
      fiscal_end_date,
    },
    org_selector,
    tiles,
    rank: null,
  };
}