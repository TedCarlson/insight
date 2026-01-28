// apps/web/src/app/roster/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type RosterRow } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { fetchActiveRosterPersonIdSet } from "@/lib/activeRoster";
import { useOrg } from "@/state/org";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";

import { RosterTable } from "@/components/roster/RosterTable";
import { RosterRowModule } from "@/components/roster/RosterRowModule";

function pickName(r: RosterRow): string {
  return (
    r.full_name ??
    r.person_name ??
    r.name ??
    [r.first_name, r.last_name].filter(Boolean).join(" ") ??
    r.email ??
    r.person_id ??
    "—"
  );
}

type RoleFilter = "technician" | "supervisor" | "all";

function roleText(r: any): string {
  return String(r?.position_title ?? r?.title ?? r?.role_title ?? "").trim();
}

function isSupervisorRow(r: any): boolean {
  return /supervisor/i.test(roleText(r));
}

function isTechnicianRow(r: any): boolean {
  // Prefer explicit title match; otherwise treat “has tech_id and not supervisor” as technician.
  const t = roleText(r);
  if (/technician/i.test(t)) return true;
  return Boolean(String(r?.tech_id ?? "").trim()) && !isSupervisorRow(r);
}

export default function RosterPage() {
  const { selectedOrgId, orgs, orgsLoading } = useOrg();
  const router = useRouter();

  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedRow, setSelectedRow] = useState<RosterRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [orgMeta, setOrgMeta] = useState<{
    mso_name: string | null;
    division_name: string | null;
    region_name: string | null;
  } | null>(null);
  const [orgMetaLoading, setOrgMetaLoading] = useState(false);

  // Client-side roster controls (no backend assumptions)
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("technician"); // default view
  // combined company+contractor dropdown:
  // "all" | "company::<name>" | "contractor::<name>"
  const [affKey, setAffKey] = useState<string>("all");
  const [supervisorKey, setSupervisorKey] = useState<string>("all");

  const validatedOrgId = useMemo(() => {
    if (orgsLoading) return null;
    if (!selectedOrgId) return null;
    return orgs.some((o: any) => String(o.pc_org_id) === String(selectedOrgId)) ? selectedOrgId : null;
  }, [selectedOrgId, orgs, orgsLoading]);

  const selectedOrgName = useMemo(() => {
    if (!validatedOrgId) return null;
    const hit = orgs.find((o: any) => String(o.pc_org_id) === String(validatedOrgId));
    return (hit?.pc_org_name ?? hit?.org_name ?? hit?.name ?? null) as string | null;
  }, [orgs, validatedOrgId]);

  const canLoad = Boolean(validatedOrgId);

  async function loadAll() {
    if (!validatedOrgId) {
      setErr(null);
      setRoster([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const r = await api.rosterCurrentFull(validatedOrgId, null);

      // Enforce: roster shows ONLY persons with ACTIVE person↔org membership for this scoped pc_org.
// Source of truth: public.v_roster_active (filters person_pc_org.active = true).
const supabase = createClient();
const activePersonIds = await fetchActiveRosterPersonIdSet(supabase as any, validatedOrgId);

const filtered = (r ?? []).filter((row: any) => {
  const pid = String(row?.person_id ?? "").trim();
  return Boolean(pid) && activePersonIds.has(pid);
});



setRoster(filtered);
    } catch (e: any) {
      setRoster([]);
      setErr(e?.message ?? "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatedOrgId]);

  useEffect(() => {
    let alive = true;

    async function loadOrgMeta() {
      if (!validatedOrgId) {
        setOrgMeta(null);
        return;
      }

      setOrgMetaLoading(true);
      try {
        const meta = await api.pcOrgAdminMeta(validatedOrgId);
        if (alive)
          setOrgMeta({
            mso_name: meta?.mso_name ?? null,
            division_name: meta?.division_name ?? null,
            region_name: meta?.region_name ?? null,
          });
      } catch {
        if (alive) setOrgMeta({ mso_name: null, division_name: null, region_name: null });
      } finally {
        if (alive) setOrgMetaLoading(false);
      }
    }

    loadOrgMeta();
    return () => {
      alive = false;
    };
  }, [validatedOrgId]);

  const rosterRoleFiltered = useMemo(() => {
    const rows = roster ?? [];
    if (roleFilter === "all") return rows;
    if (roleFilter === "supervisor") return rows.filter((r: any) => isSupervisorRow(r));
    return rows.filter((r: any) => isTechnicianRow(r));
  }, [roster, roleFilter]);

  const affiliationOptions = useMemo(() => {
    const rows = rosterRoleFiltered ?? [];
    const map = new Map<string, string>(); // key -> label

    for (const r of rows as any[]) {
      const type = String(r?.co_type ?? "").trim();
      const name = String(r?.co_name ?? "").trim();
      if (!type || !name) continue;

      const key = `${type}::${name}`;
      const typeLabel = type === "contractor" ? "Contractor" : type === "company" ? "Company" : type;
      const label = `${typeLabel}: ${name}`;

      if (!map.has(key)) map.set(key, label);
    }

    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [rosterRoleFiltered]);

const supervisorOptions = useMemo(() => {
  // list supervisors by unique reports_to_person_id from roster rows (tech view)
  const rows = rosterRoleFiltered ?? [];
  const map = new Map<string, string>(); // id -> name

  for (const r of rows as any[]) {
    const sid = String(r?.reports_to_person_id ?? "").trim();
    const sname = String(r?.reports_to_full_name ?? "").trim();
    if (!sid || !sname) continue;
    if (!map.has(sid)) map.set(sid, sname);
  }

  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}, [rosterRoleFiltered]);



  useEffect(() => {
    if (affKey === "all") return;
    if (!affiliationOptions.some((o) => o.key === affKey)) setAffKey("all");
                  setSupervisorKey("all");
  }, [affKey, affiliationOptions]);

useEffect(() => {
  if (supervisorKey === "all") return;
  if (!supervisorOptions.some((o) => o.id === supervisorKey)) setSupervisorKey("all");
}, [supervisorKey, supervisorOptions]);



  const filteredRoster = useMemo(() => {
    const rows = (rosterRoleFiltered ?? []).slice();
    const q = query.trim().toLowerCase();

    const matchesSearch = (r: any) => {
      if (!q) return true;
      const hay = [
        r?.tech_id,
        r?.full_name ?? pickName(r),
        r?.mobile,
        r?.person_nt_login,
        r?.person_csg_id,
        r?.co_name,
        roleText(r),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    };

    const matchesAff = (r: any) => {
      if (affKey === "all") return true;
      const [type, name] = String(affKey).split("::");
      return String(r?.co_type ?? "") === type && String(r?.co_name ?? "") === name;
    };

    

const matchesSupervisor = (r: any) => {
  if (supervisorKey === "all") return true;
  return String(r?.reports_to_person_id ?? "").trim() === String(supervisorKey).trim();
};

const isInScopedOrg = (r: any) => {
  // Roster membership is already filtered by v_roster_active; this check only ensures
  // the row is aligned to the currently scoped org (when pc_org_id is present).
  if (!validatedOrgId) return false;
  const orgId = String(r?.pc_org_id ?? "").trim();
  return !orgId || orgId === String(validatedOrgId);
};


const out = rows.filter((r: any) => matchesAff(r) && matchesSearch(r) && matchesSupervisor(r) && isInScopedOrg(r));

    // Default sort: tech_id then full_name
    out.sort((a: any, b: any) => {
      const aTech = String(a?.tech_id ?? "");
      const bTech = String(b?.tech_id ?? "");
      const techCmp = aTech.localeCompare(bTech, undefined, { numeric: true, sensitivity: "base" });
      if (techCmp !== 0) return techCmp;

      const aName = String(a?.full_name ?? pickName(a) ?? "");
      const bName = String(b?.full_name ?? pickName(b) ?? "");
      return aName.localeCompare(bName, undefined, { sensitivity: "base" });
    });

    return out;
  }, [rosterRoleFiltered, query, affKey, supervisorKey, validatedOrgId]);


const rosterStats = useMemo(() => {
  // Tech stats are based on the CURRENT view (filteredRoster), since managers will filter by supervisor/search/etc.
  const techRows = filteredRoster ?? [];

  const totalTechs = techRows.length;
  const itgTechs = techRows.filter((r: any) => String(r?.co_type ?? "").trim() === "company").length;
  const bpTechs = techRows.filter((r: any) => String(r?.co_type ?? "").trim() === "contractor").length;

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  // We still compute these for housekeeping (but we won't render the numbers)
  const assignmentSet = techRows.filter((r: any) => {
    const end = String(r?.assignment_end_date ?? r?.end_date ?? "").trim();
    const active = Boolean(r?.assignment_active ?? r?.active ?? true);
    return active && !end && !!String(r?.assignment_id ?? "").trim();
  }).length;

  const leadershipSet = techRows.filter((r: any) => {
    const end = String(r?.reports_to_end_date ?? r?.leadership_end_date ?? "").trim();
    const rid =
      r?.reports_to_reporting_id ??
      r?.assignment_reporting_id ??
      r?.reporting_id ??
      r?.id ??
      null;
    return !!rid && !end;
  }).length;
const scheduleReady = techRows.filter((r: any) => {
  const assignmentEnd = String(r?.assignment_end_date ?? r?.end_date ?? "").trim();
  const assignmentActive = Boolean(r?.assignment_active ?? r?.active ?? true);
  const hasAssignment = !!String(r?.assignment_id ?? "").trim() && assignmentActive && !assignmentEnd;

  const leadershipEnd = String(r?.reports_to_end_date ?? r?.leadership_end_date ?? "").trim();
  const leadershipId =
    r?.reports_to_reporting_id ??
    r?.assignment_reporting_id ??
    r?.reporting_id ??
    r?.id ??
    null;
  const hasLeadership = !!leadershipId && !leadershipEnd;

  return hasAssignment && hasLeadership;
}).length;


  const clean = totalTechs > 0 && totalTechs === assignmentSet && totalTechs === leadershipSet;

  // Supervisor stats: supervisors referenced by the tech rows in this view
  const supIds = Array.from(
    new Set(
      techRows
        .map((r: any) => String(r?.reports_to_person_id ?? "").trim())
        .filter(Boolean)
    )
  );

  // Best-effort supervisor classification:
  // if a supervisor appears as a roster row, use their co_type to classify ITG vs BP.
  const allRows = roster ?? [];
  const isInScopedOrg = (r: any) => {
  // Roster membership is already filtered by v_roster_active; this check only ensures
  // the row is aligned to the currently scoped org (when pc_org_id is present).
  if (!validatedOrgId) return false;
  const orgId = String(r?.pc_org_id ?? "").trim();
  return !orgId || orgId === String(validatedOrgId);
};


  const activeRowsAll = allRows.filter((r: any) => isInScopedOrg(r));
  const supervisorById = new Map<string, any>();
  for (const r of activeRowsAll as any[]) {
    const pid = String(r?.person_id ?? "").trim();
    if (!pid) continue;
    if (!supervisorById.has(pid)) supervisorById.set(pid, r);
  }

  let itgSups = 0;
  let bpSups = 0;
  let unknownSups = 0;

  for (const sid of supIds) {
    const sr = supervisorById.get(String(sid));
    const t = String(sr?.co_type ?? "").trim();
    if (t === "company") itgSups++;
    else if (t === "contractor") bpSups++;
    else unknownSups++;
  }

  const totalSups = supIds.length;

  return {
    totalTechs,
    itgTechs,
    bpTechs,
    techPctITG: pct(itgTechs, totalTechs),
    techPctBP: pct(bpTechs, totalTechs),

    totalSups,
    itgSups,
    bpSups,
    supPctITG: pct(itgSups, totalSups),
    supPctBP: pct(bpSups, totalSups),
    unknownSups,

    readinessA: assignmentSet,
    readinessL: leadershipSet,
    readinessS: scheduleReady,

    clean,
  };
}, [filteredRoster, roster, validatedOrgId]);




  const anyFiltersActive = Boolean(query.trim()) || roleFilter !== "technician" || affKey !== "all";
  const headerRefreshDisabled = orgsLoading || !canLoad || loading;

  return (
    <PageShell>
      <PageHeader
        title="Roster"
        subtitle="Current roster (scoped by PC access gate)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={() => router.push("/onboard")} disabled={orgsLoading}>
              Onboard
            </Button>
            <Button variant="secondary" type="button" onClick={loadAll} disabled={headerRefreshDisabled}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      {canLoad && err ? (
        <Notice variant="danger" title="Could not load roster">
          <div className="text-sm">{err}</div>
          <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
            If this is a permission issue, you should see a hard <code>Forbidden</code> / <code>Unauthorized</code>{" "}
            error (expected behavior).
          </div>
        </Notice>
      ) : null}

      <Card variant="subtle">
        <Toolbar
          left={
            validatedOrgId ? (
              <div className="text-sm">
                Org scope: <span className="font-semibold">{selectedOrgName ?? "—"}</span>
              </div>
            ) : (
              <div className="text-sm text-[var(--to-ink-muted)]">Select a PC org in the header to load the roster.</div>
            )
          }
          right={
            <div className="text-xs text-[var(--to-ink-muted)] text-right">
              {validatedOrgId ? (
                <div>
                  <span>
                    MSO: <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.mso_name ?? "—"}</span>
                  </span>
                  <span className="px-2"> • </span>
                  <span>
                    Division:{" "}
                    <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.division_name ?? "—"}</span>
                  </span>
                  <span className="px-2"> • </span>
                  <span>
                    Region: <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.region_name ?? "—"}</span>
                  </span>
                </div>
              ) : null}
            </div>
          }
        />
      </Card>

      <Card>
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Current roster</div>

          <div className="text-xs text-[var(--to-ink-muted)] text-right">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span>Readiness:</span>
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px]">
                A<span className="text-[var(--to-ink)]">{rosterStats.readinessA}</span>
              </span>
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px]">
                L<span className="text-[var(--to-ink)]">{rosterStats.readinessL}</span>
              </span>
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px]">
                S<span className="text-[var(--to-ink)]">{rosterStats.readinessS}</span>
              </span>
            </div>

            <div className="mt-2 flex justify-end">
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]"
                style={
                  rosterStats.clean
                    ? {
                        background: "rgba(34, 197, 94, 0.14)",
                        borderColor: "var(--to-status-success)",
                        color: "var(--to-status-success)",
                      }
                    : {
                        background: "rgba(249, 115, 22, 0.16)",
                        borderColor: "var(--to-status-warning)",
                        color: "var(--to-status-warning)",
                      }
                }
              >
                {rosterStats.clean ? "Clean" : "Needs housekeeping"}
              </span>
            </div>
          </div>
        </div>


          <div className="flex flex-wrap items-center gap-2">
            {/* Role pills */}
            <div className="flex items-center gap-1 rounded-full border border-[var(--to-border)] p-1">
              <Button
                type="button"
                variant={roleFilter === "technician" ? "secondary" : "ghost"}
                className="rounded-full px-3 py-1 text-xs"
                style={
                  roleFilter === "technician"
                    ? { background: "var(--to-toggle-active-bg)", borderColor: "var(--to-toggle-active-border)" }
                    : undefined
                }
                onClick={() => setRoleFilter("technician")}
              >
                Technician
              </Button>
              <Button
                type="button"
                variant={roleFilter === "supervisor" ? "secondary" : "ghost"}
                className="rounded-full px-3 py-1 text-xs"
                style={
                  roleFilter === "supervisor"
                    ? { background: "var(--to-toggle-active-bg)", borderColor: "var(--to-toggle-active-border)" }
                    : undefined
                }
                onClick={() => setRoleFilter("supervisor")}
              >
                Supervisor
              </Button>
              <Button
                type="button"
                variant={roleFilter === "all" ? "secondary" : "ghost"}
                className="rounded-full px-3 py-1 text-xs"
                style={
                  roleFilter === "all"
                    ? { background: "var(--to-toggle-active-bg)", borderColor: "var(--to-toggle-active-border)" }
                    : undefined
                }
                onClick={() => setRoleFilter("all")}
              >
                All
              </Button>
            </div>
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search (tech id, name, mobile, nt login, csg, affiliation)…"
              className="w-full sm:w-80"
            />

            {/* Combined Company + Contractor dropdown */}
            <Select
              value={affKey}
              onChange={(e) => setAffKey(e.target.value)}
              className="w-full sm:w-80"
              disabled={affiliationOptions.length === 0}
            >
              <option value="all">All affiliations</option>
              {affiliationOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </Select>

{/* Supervisor filter */}
<Select
  value={supervisorKey}
  onChange={(e) => setSupervisorKey(e.target.value)}
  className="w-full sm:w-80"
  disabled={supervisorOptions.length === 0}
>
  <option value="all">All supervisors</option>
  {supervisorOptions.map((o) => (
    <option key={o.id} value={o.id}>
      {o.name}
    </option>
  ))}
</Select>


            {anyFiltersActive && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setRoleFilter("technician");
                  setAffKey("all");
                  setSupervisorKey("all");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {orgsLoading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading organizations…</div>
        ) : !canLoad ? (
          <EmptyState
            title={orgs.length ? "Select an organization" : "No organizations available"}
            message={
              orgs.length
                ? "Choose an org in the header to load the roster."
                : "This user has no org access. Ask an owner/admin to grant access or add membership."
            }
            compact
          />
        ) : loading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading roster…</div>
        ) : filteredRoster.length === 0 ? (
          <EmptyState
            title={rosterRoleFiltered.length ? "No matches" : "No active roster entries"}
            message={
              rosterRoleFiltered.length
                ? "Try clearing filters or changing your search."
                : "This org has no current assignments (or you don’t have access)."
            }
            compact
          />
        ) : (
          <RosterTable
            roster={filteredRoster}
            pickName={pickName}
            onRowOpen={(row) => {
              setSelectedRow(row);
              setDetailsOpen(true);
            }}
          />
        )}
      </Card>

      {validatedOrgId ? (
        <RosterRowModule
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            // Ensure roster reflects any edits after closing the overlay
            void loadAll();
          }}
          pcOrgId={validatedOrgId}
          pcOrgName={selectedOrgName}
          row={selectedRow}
        />
      ) : null}
    </PageShell>
  );
}
