// apps/web/src/app/roster/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { api, type RosterRow } from "@/lib/api";
import { createClient } from "@/shared/data/supabase/client";
import { fetchActiveRosterPersonIdSet } from "@/lib/activeRoster";
import { useOrg } from "@/state/org";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/state/session";
import { useRosterManageAccess } from "@/hooks/useRosterManageAccess";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";

import { RosterTable } from "@/features/roster/components/RosterTable";
import { RosterRowModule } from "@/features/roster/components/RosterRowModule";

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
  const t = roleText(r);
  if (/technician/i.test(t)) return true;
  return Boolean(String(r?.tech_id ?? "").trim()) && !isSupervisorRow(r);
}

export default function RosterPage() {
  const { selectedOrgId, orgs, orgsLoading } = useOrg();
  const router = useRouter();
  const toast = useToast();

  const [modifyMode, setModifyMode] = useState<"open" | "locked">("locked");

  // ✅ Permission gate: owner OR roster_manage
  const { isOwner } = useSession();
  const { allowed: canManageRoster, loading: rosterPermLoading } = useRosterManageAccess();
  const canEditRoster = isOwner || canManageRoster;

  useEffect(() => {
    if (!canEditRoster && modifyMode !== "locked") {
      setModifyMode("locked");
    }
  }, [canEditRoster, modifyMode]);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickRow, setQuickRow] = useState<RosterRow | null>(null);
  const [quickPos, setQuickPos] = useState<{ top: number; left: number } | null>(null);

  const closeQuick = () => {
    setQuickOpen(false);
    setQuickRow(null);
    setQuickPos(null);
  };

  const openQuick = (row: RosterRow, anchorEl: HTMLElement) => {
    const rect = anchorEl.getBoundingClientRect();
    const width = 420;
    const pad = 12;
    const estHeight = 260;

    const topBelow = rect.bottom + 10;
    const top =
      typeof window !== "undefined" && topBelow + estHeight > window.innerHeight - pad
        ? Math.max(pad, rect.top - 10 - estHeight)
        : topBelow;

    const left =
      typeof window !== "undefined"
        ? Math.min(Math.max(pad, rect.left), window.innerWidth - width - pad)
        : rect.left;

    setQuickRow(row);
    setQuickPos({ top, left });
    setQuickOpen(true);
  };

  const copyQuickContents = async () => {
    try {
      if (!quickRow) return;

      const name = pickName(quickRow);
      const techId = String((quickRow as any)?.tech_id ?? "—");
      const personId = String((quickRow as any)?.person_id ?? "—");

      const mobile = String((quickRow as any)?.mobile ?? "—") || "—";
      const ntLogin = String((quickRow as any)?.person_nt_login ?? "—") || "—";
      const csg = String((quickRow as any)?.person_csg_id ?? "—") || "—";
      const affiliation = String((quickRow as any)?.co_name ?? "—") || "—";
      const reportsTo = String((quickRow as any)?.reports_to_full_name ?? "—") || "—";

      const pad = (k: string, n = 12) => (k + ":").padEnd(n, " ");

      const text =
        `${name}
Tech ID: ${techId} • Person: ${personId}

${pad("Mobile")}${mobile}
${pad("NT Login")}${ntLogin}
${pad("CSG")}${csg}
${pad("Affiliation")}${affiliation}
${pad("Reports To")}${reportsTo}`.trim();

      await navigator.clipboard.writeText(text);

      toast.push({
        title: "Copied",
        message: "Quick view copied to clipboard.",
        variant: "success",
      });
    } catch {
      toast.push({
        title: "Copy failed",
        message: "Could not copy to clipboard.",
        variant: "warning",
      });
    }
  };

  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<RosterRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("technician");
  const [query, setQuery] = useState("");
  const [affKey, setAffKey] = useState("all");
  const [supervisorKey, setSupervisorKey] = useState("all");

  const [orgMetaLoading, setOrgMetaLoading] = useState(false);
  const [orgMeta, setOrgMeta] = useState<{
    mso_name?: string | null;
    division_name?: string | null;
    region_name?: string | null;

    pc_lead_label?: string | null;
    pc_lead_role_key?: string | null;

    director_label?: string | null;
    director_role_key?: string | null;

    vp_label?: string | null;
    vp_role_key?: string | null;

    // legacy fallback (still returned by API)
    manager_label?: string | null;
  } | null>(null);

  const validatedOrgId = useMemo(() => {
    const v = String(selectedOrgId ?? "").trim();
    return v || null;
  }, [selectedOrgId]);

  const selectedOrgName = useMemo(() => {
    if (!validatedOrgId) return null;
    const o = (orgs ?? []).find((x: any) => String(x?.pc_org_id ?? "").trim() === String(validatedOrgId));
    return (o as any)?.pc_org_name ?? (o as any)?.name ?? null;
  }, [validatedOrgId, orgs]);

  const canLoad = Boolean(validatedOrgId);

  const loadOrgMeta = async () => {
    if (!validatedOrgId) return;
    try {
      setOrgMetaLoading(true);

      const res = await fetch("/api/org/roster-header", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pc_org_id: validatedOrgId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load org meta");

      setOrgMeta(json?.data ?? null);
    } catch {
      setOrgMeta(null);
    } finally {
      setOrgMetaLoading(false);
    }
  };

  const loadAll = async () => {
    if (!validatedOrgId) return;

    setLoading(true);
    setErr(null);

    try {
      const activeSet = await fetchActiveRosterPersonIdSet(supabase, validatedOrgId);
      const data = await api.rosterCurrentFull(validatedOrgId);

      const rows = (data ?? []).filter((r: any) => {
        const pid = String(r?.person_id ?? "").trim();
        return pid && activeSet.has(pid);
      });

      setRoster(rows as any);

      if (selectedRow) {
        const selPid = String((selectedRow as any)?.person_id ?? "").trim();
        const next = rows.find((r: any) => String(r?.person_id ?? "").trim() === selPid) as any;
        if (next) setSelectedRow(next);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e ?? "Failed to load roster"));
      setRoster([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrgMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatedOrgId]);

  useEffect(() => {
    if (!validatedOrgId) {
      setRoster([]);
      setErr(null);
      setSelectedRow(null);
      setDetailsOpen(false);
      closeQuick();
      return;
    }
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatedOrgId]);

  const rosterRoleFiltered = useMemo(() => {
    const rows = (roster ?? []).slice();

    if (roleFilter === "all") return rows;
    if (roleFilter === "technician") return rows.filter(isTechnicianRow);
    if (roleFilter === "supervisor") return rows.filter(isSupervisorRow);
    return rows;
  }, [roster, roleFilter]);

  const affiliationOptions = useMemo(() => {
    const rows = rosterRoleFiltered ?? [];
    const map = new Map<string, { type: string; name: string; label: string }>();

    for (const r of rows as any[]) {
      const type = String(r?.co_type ?? "").trim();
      const name = String(r?.co_name ?? "").trim();
      if (!type || !name) continue;

      const key = `${type}::${name}`;
      if (map.has(key)) continue;

      const label = type === "company" ? `ITG • ${name}` : `BP • ${name}`;
      map.set(key, { type, name, label });
    }

    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [rosterRoleFiltered]);

  const supervisorOptions = useMemo(() => {
    const rows = rosterRoleFiltered ?? [];
    const map = new Map<string, string>();

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

  useEffect(() => {
    if (!validatedOrgId) return;

    setOrgMeta(null);
    setOrgMetaLoading(true);

    setErr(null);
    setModifyMode("locked");

    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatedOrgId]);

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
      if (!validatedOrgId) return false;
      const orgId = String(r?.pc_org_id ?? "").trim();
      return !orgId || orgId === String(validatedOrgId);
    };

    const out = rows.filter((r: any) => matchesAff(r) && matchesSearch(r) && matchesSupervisor(r) && isInScopedOrg(r));

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
    const techRows = filteredRoster ?? [];

    const totalTechs = techRows.length;
    const itgTechs = techRows.filter((r: any) => String(r?.co_type ?? "").trim() === "company").length;
    const bpTechs = techRows.filter((r: any) => String(r?.co_type ?? "").trim() === "contractor").length;

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    const assignmentSet = techRows.filter((r: any) => {
      const end = String(r?.assignment_end_date ?? r?.end_date ?? "").trim();
      const active = Boolean(r?.assignment_active ?? r?.active ?? true);
      return active && !end && !!String(r?.assignment_id ?? "").trim();
    }).length;

    const leadershipSet = techRows.filter((r: any) => {
      const end = String(r?.reports_to_end_date ?? r?.leadership_end_date ?? "").trim();
      const rid = r?.reports_to_reporting_id ?? r?.assignment_reporting_id ?? r?.reporting_id ?? r?.id ?? null;
      return !!rid && !end;
    }).length;

    const clean = totalTechs > 0 && totalTechs === assignmentSet && totalTechs === leadershipSet;

    return {
      totalTechs,
      itgTechs,
      bpTechs,
      techPctITG: pct(itgTechs, totalTechs),
      techPctBP: pct(bpTechs, totalTechs),
      readinessA: assignmentSet,
      readinessL: leadershipSet,
      clean,
    };
  }, [filteredRoster]);

  const anyFiltersActive = Boolean(query.trim()) || roleFilter !== "technician" || affKey !== "all";
  const headerRefreshDisabled = orgsLoading || !canLoad || loading || orgMetaLoading;

  const modifyToggleVars =
  modifyMode === "open"
    ? ({
        ["--to-toggle-active-bg" as any]: "rgba(249, 115, 22, 0.16)",
        ["--to-toggle-active-border" as any]: "var(--to-status-warning)",
        ["--to-toggle-active-ink" as any]: "var(--to-status-warning)",
      } as CSSProperties)
    : undefined;

  return (
    <PageShell>
      <Card variant="subtle">
        <Toolbar
          left={
            validatedOrgId ? (
              <div className="min-w-0 flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => router.push("/onboard")}
                    disabled={orgsLoading || rosterPermLoading || !canEditRoster}
                    title={!canEditRoster ? "Requires roster_manage permission" : "Onboard a person into the roster"}
                    className="h-8 px-3 text-xs"
                  >
                    Onboard
                  </Button>

                  <Button
                    variant="secondary"
                    type="button"
                    onClick={loadAll}
                    disabled={headerRefreshDisabled}
                    className="h-8 px-3 text-xs"
                  >
                    {loading ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>

                <span className="px-2 text-[var(--to-ink-muted)]">•</span>

                <div className="min-w-0 text-sm">
                  <span className="font-semibold">Roster</span>
                  <span className="px-2 text-[var(--to-ink-muted)]">•</span>
                  <span className="text-[var(--to-ink-muted)]">PC #</span>{" "}
                  <span className="font-semibold">{selectedOrgName ?? "—"}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--to-ink-muted)]">Select a PC org in the header to load the roster.</div>
            )
          }
          right={
            validatedOrgId ? (
              <div className="min-w-0 text-[12px] leading-4 text-[var(--to-ink-muted)] text-right whitespace-nowrap">
                <span>MSO:</span>{" "}
                <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.mso_name ?? "—"}</span>
                <span className="px-2">•</span>
                <span>Division:</span>{" "}
                <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.division_name ?? "—"}</span>
                <span className="px-2">•</span>
                <span>Region:</span>{" "}
                <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.region_name ?? "—"}</span>
                <span className="px-2">•</span>
                <span>Manager:</span>{" "}
                <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.pc_lead_label ?? "—"}</span>
                <span className="px-2">•</span>
                <span>Director:</span>{" "}
                <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.director_label ?? "—"}</span>
                <span className="px-2">•</span>
                <span>VP:</span> <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.vp_label ?? "—"}</span>
              </div>
            ) : null
          }
        />
      </Card>

      {canLoad && err ? (
        <Notice variant="danger" title="Could not load roster">
          <div className="text-sm">{err}</div>
          <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
            If this is a permission issue, you should see a hard <code>Forbidden</code> / <code>Unauthorized</code>{" "}
            error (expected behavior).
          </div>
        </Notice>
      ) : null}

      <Card>
        <div className="mb-3 flex flex-col gap-2">
          {/* ONE ROW: Modify + Readiness inline with filters/search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Modify + Readiness group (LEFT) */}
            <div className="flex items-center gap-3 rounded-full border border-[var(--to-border)] px-2 h-10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--to-ink-muted)]">Modify</span>
                <span style={modifyToggleVars}>
                  <SegmentedControl
                    value={modifyMode}
                    onChange={(v) => {
                      if (!canEditRoster) {
                        toast.push({
                          title: "Permission required",
                          message: "You need roster_manage to unlock modify mode.",
                          variant: "warning",
                        });
                        return;
                      }
                      setModifyMode(v as "open" | "locked");
                    }}
                    options={[
                      { value: "locked", label: "Locked" },
                      { value: "open", label: "Open" },
                    ]}
                    size="sm"
                    className={!canEditRoster ? "opacity-60" : undefined}
                  />
                </span>
              </div>

              <span className="text-[var(--to-ink-muted)]">•</span>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--to-ink-muted)]">Readiness</span>
                <span
                  className="inline-flex items-center rounded-full border px-2 text-xs h-8"
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
                  {rosterStats.clean ? "Ready" : "Incomplete"}
                </span>
                
              </div>
            </div>
            <span className="text-[var(--to-ink-muted)]">•</span>
            {/* Role pills */}
            <div className="flex items-center gap-1 rounded-full border border-[var(--to-border)] p-1 h-10">
              <Button
                type="button"
                variant={roleFilter === "technician" ? "secondary" : "ghost"}
                className="rounded-full px-3 h-8 text-xs"
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
              className="w-full sm:w-80 h-10"
            />

            <Select
              value={affKey}
              onChange={(e) => setAffKey(e.target.value)}
              className="w-full sm:w-80 h-10"
              disabled={affiliationOptions.length === 0}
            >
              <option value="all">All affiliations</option>
              {affiliationOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </Select>

            <Select
              value={supervisorKey}
              onChange={(e) => setSupervisorKey(e.target.value)}
              className="w-full sm:w-80 h-10"
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
                className="h-10 px-3 text-xs"
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
            modifyMode={modifyMode}
            onRowOpen={(row) => {
              closeQuick();
              setSelectedRow(row);
              setDetailsOpen(true);
            }}
            onRowQuickView={(row, el) => {
              setSelectedRow(row);
              setDetailsOpen(false);
              openQuick(row, el);
            }}
          />
        )}
      </Card>

      {quickOpen && quickRow && quickPos ? (
        <div className="fixed inset-0 z-50" onMouseDown={closeQuick}>
          <div
            className="fixed z-50 w-[420px]"
            style={{ top: quickPos.top, left: quickPos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{pickName(quickRow)}</div>
                  <div className="text-xs text-[var(--to-ink-muted)]">
                    Tech ID: {String((quickRow as any)?.tech_id ?? "—")}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={copyQuickContents}>
                    Copy
                  </Button>

                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={closeQuick}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm">
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 text-[var(--to-ink-muted)]">Mobile</div>
                  <div className="col-span-8 font-medium">{(quickRow as any)?.mobile ?? "—"}</div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 text-[var(--to-ink-muted)]">NT Login</div>
                  <div className="col-span-8 font-medium">{(quickRow as any)?.person_nt_login ?? "—"}</div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 text-[var(--to-ink-muted)]">CSG</div>
                  <div className="col-span-8 font-medium">{(quickRow as any)?.person_csg_id ?? "—"}</div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 text-[var(--to-ink-muted)]">Affiliation</div>
                  <div className="col-span-8 font-medium">{(quickRow as any)?.co_name ?? "—"}</div>
                </div>

                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-4 text-[var(--to-ink-muted)]">Reports To</div>
                  <div className="col-span-8 font-medium">{(quickRow as any)?.reports_to_full_name ?? "—"}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {validatedOrgId ? (
        <RosterRowModule
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
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