// apps/web/src/features/roster/add-to-roster/components/AddToRosterDrawer.tsx
"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/Toast";

import { PersonSearch } from "@/features/roster/add-to-roster/components/PersonSearch";
import {
  useAddToRoster,
  type OnboardPersonDraft,
  type CoOption,
} from "@/features/roster/add-to-roster/hooks/useAddToRoster";
import { usePersonSearch, type PersonHit } from "@/features/roster/add-to-roster/hooks/usePersonSearch";
import { formatPersonTitle, formatPersonSubtitle, markMatches } from "@/features/roster/add-to-roster/lib/personSearchFormat";

import { createClient } from "@/shared/data/supabase/client";
import { fetchActiveMembershipOrgByPersonIds } from "@/shared/lib/activeRoster";
import { resolveActiveLob, lobLabel, type Lob } from "@/shared/lob";

// ✅ reuse existing actions (keeps blast radius tiny)
import {
  loadPositionTitlesAction,
  loadMasterAction,
  type PositionTitleRow,
} from "@/features/roster/hooks/rosterRowModule.actions";

type OfficeOption = { id: string; label: string; sublabel?: string | null };

type Props = {
  open: boolean;
  onClose: () => void;

  pcOrgId: string;
  pcOrgName?: string | null;

  canEdit: boolean;
  onAdded?: () => void;

  excludePersonIds?: Set<string>;
};

function emptyDraft(): OnboardPersonDraft {
  return {
    person_id: null,
    full_name: "",
    emails: "",
    mobile: "",
    fuse_emp_id: "",
    person_notes: "",
    person_nt_login: "",
    person_csg_id: "",
    active: null,
    role: null,
    co_ref_id: null,
    co_code: null,
    co_name: null,
    co_type: null,

    // New Person extras
    tech_id: "",
    office_id: null,
    reports_to_assignment_id: null,
  };
}

function buildLooksLikeQuery(d: OnboardPersonDraft, lob: Lob): string {
  const parts = [
    d.full_name,
    d.emails,
    d.mobile,
    d.fuse_emp_id,
    ...(lob === "LOCATE" ? [] : [d.person_nt_login, d.person_csg_id]),
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);

  return parts.join(" ").trim();
}

function coLabelFor(coRefId: string | null, coOptions: CoOption[]): string {
  if (!coRefId) return "—";
  const hit = coOptions.find((o) => String(o.co_ref_id) === String(coRefId)) ?? null;
  if (!hit) return "—";
  return hit.co_type ? `${hit.co_name} (${hit.co_type})` : hit.co_name;
}

function isAllowedPositionTitle(t: string): boolean {
  const s = String(t ?? "").trim();
  if (!s) return false;

  // Keep “Manager and below”; exclude higher leadership titles.
  if (/(director|sr\.?\s*director|vp|vice\s*president|president|ceo|cfo|coo|owner)/i.test(s)) return false;

  return true;
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function titleRankFallback(titleRaw: string) {
  const t = norm(titleRaw).toLowerCase();
  if (t.includes("technician")) return 10;
  if (t.includes("supervisor")) return 20;
  if (t.includes("manager")) return 30;
  if (t.includes("director")) return 40;
  if (t.includes("vp") || t.includes("vice president")) return 50;
  return 25;
}

function getRankForTitle(title: string, positionTitles: PositionTitleRow[]) {
  const map = new Map<string, number>();
  for (const pt of positionTitles ?? []) {
    const key = norm((pt as any)?.position_title);
    const so = Number((pt as any)?.sort_order);
    if (key && Number.isFinite(so)) map.set(key, so);
  }

  const direct = map.get(norm(title));
  return typeof direct === "number" ? direct : titleRankFallback(title);
}

function sortIncreasesWithSeniority(positionTitles: PositionTitleRow[]) {
  const map = new Map<string, number>();
  for (const pt of positionTitles ?? []) {
    const key = norm((pt as any)?.position_title);
    const so = Number((pt as any)?.sort_order);
    if (key && Number.isFinite(so)) map.set(key, so);
  }

  const tech = map.get("Technician");
  const sup = map.get("Supervisor");
  if (typeof tech === "number" && typeof sup === "number") return tech < sup;
  return true;
}

export function AddToRosterDrawer({
  open,
  onClose,
  pcOrgId,
  pcOrgName,
  canEdit,
  onAdded,
  excludePersonIds,
}: Props) {
  const toast = useToast();
  const pathname = usePathname();
  const lob = resolveActiveLob(pathname);

  const supabase = useMemo(() => createClient(), []);

  const {
    saving,
    coLoading,
    coOptions,
    ensureCoOptions,
    upsertAndAddMembership,
    addNewPersonWaterfall,
  } = useAddToRoster();

  const pickSearch = usePersonSearch({ excludePersonIds, lob });
  const looksLikeSearch = usePersonSearch({ excludePersonIds, lob });

  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [draft, setDraft] = useState<OnboardPersonDraft>(() => emptyDraft());

  // Assignment controls
  const [startAssignment, setStartAssignment] = useState<boolean>(true);

  // Position dropdown
  const [positionTitle, setPositionTitle] = useState<string>("Technician");
  const [positionTitles, setPositionTitles] = useState<PositionTitleRow[]>([]);
  const [positionTitlesLoading, setPositionTitlesLoading] = useState(false);
  const [positionTitlesError, setPositionTitlesError] = useState<string | null>(null);

  const positionOptions = useMemo(() => {
    const list = [...(positionTitles ?? [])]
      .filter((r) => r && typeof (r as any).position_title === "string")
      .filter((r) => isAllowedPositionTitle((r as any).position_title));

    list.sort(
      (a, b) =>
        Number((a as any).sort_order ?? 0) - Number((b as any).sort_order ?? 0) ||
        norm((a as any).position_title).localeCompare(norm((b as any).position_title), undefined, {
          sensitivity: "base",
        })
    );

    return list.map((r) => norm((r as any).position_title)).filter(Boolean);
  }, [positionTitles]);

  // Offices (optional)
  const [officeOptions, setOfficeOptions] = useState<OfficeOption[]>([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeError, setOfficeError] = useState<string | null>(null);

  // Leadership candidates (optional)
  const [masterRows, setMasterRows] = useState<any[] | null>(null);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterErr, setMasterErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // Load position titles when opened
    const t = window.setTimeout(() => {
      void loadPositionTitlesAction({
        pcOrgId,
        setLoading: setPositionTitlesLoading,
        setError: setPositionTitlesError,
        setRows: setPositionTitles,
      });
    }, 0);

    return () => window.clearTimeout(t);
  }, [open, pcOrgId]);

  useEffect(() => {
    if (!open) return;
    if (!pcOrgId) return;

    // Load offices when opened
    let cancelled = false;
    (async () => {
      setOfficeLoading(true);
      setOfficeError(null);
      try {
        const res = await fetch(`/api/meta/offices?pc_org_id=${encodeURIComponent(String(pcOrgId))}`);
        const json = await res.json().catch(() => ({}));

        const list =
          Array.isArray(json)
            ? json
            : Array.isArray((json as any)?.rows)
              ? (json as any).rows
              : Array.isArray((json as any)?.data)
                ? (json as any).data
                : [];

        const rows: OfficeOption[] = (list ?? [])
          .filter((o: any) => o && (o.id || o.office_id))
          .map((o: any) => {
            const id = String(o.id ?? o.office_id);
            const label = String(o.label ?? o.office_name ?? o.name ?? id);
            const sublabel = o.sublabel ? String(o.sublabel) : null;
            return { id, label, sublabel };
          })
          .sort((a: OfficeOption, b: OfficeOption) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

        if (!cancelled) setOfficeOptions(rows);
      } catch (e: any) {
        if (!cancelled) {
          setOfficeError(e?.message ?? "Failed to load offices");
          setOfficeOptions([]);
        }
      } finally {
        if (!cancelled) setOfficeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, pcOrgId]);

  useEffect(() => {
    if (!open) return;
    if (!pcOrgId) return;

    // Load roster master (for leadership default + dropdown)
    const t = window.setTimeout(() => {
      void loadMasterAction({
        pcOrgId,
        setLoading: setMasterLoading,
        setErr: setMasterErr,
        setRows: (rows: any) => setMasterRows(Array.isArray(rows) ? rows : null),
      });
    }, 0);

    return () => window.clearTimeout(t);
  }, [open, pcOrgId]);

  useEffect(() => {
    if (!open) return;
    if (!positionOptions.length) return;

    // default selection: Technician if available
    const cur = norm(positionTitle);
    if (cur && positionOptions.includes(cur)) return;

    const tech =
      positionOptions.find((t) => t === "Technician") ??
      positionOptions.find((t) => norm(t).toLowerCase() === "technician") ??
      null;

    setPositionTitle(tech ?? positionOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, positionOptions.join("|")]);

  const [activeOrgNameByPersonId, setActiveOrgNameByPersonId] = useState<Map<string, string>>(() => new Map());

  const didEnsureCoOptionsRef = useRef(false);

  const title = useMemo(() => pcOrgName ?? pcOrgId, [pcOrgName, pcOrgId]);
  const locked = !canEdit;
  const disabled = saving || locked;

  useEffect(() => {
    if (!open) return;

    if (didEnsureCoOptionsRef.current) return;
    didEnsureCoOptionsRef.current = true;

    void ensureCoOptions().catch(() => {});
  }, [open, ensureCoOptions]);

  useEffect(() => {
    if (!open) didEnsureCoOptionsRef.current = false;
  }, [open]);

  // ✅ New Person required fields: full name + affiliation ONLY
  const fullName = norm(draft.full_name);
  const coKey = draft.co_ref_id ? String(draft.co_ref_id) : "none";
  const canSubmitNew = !disabled && Boolean(fullName) && Boolean(draft.co_ref_id);

  const onPickAffiliation = (newCoRefId: string) => {
    const opt = coOptions.find((o) => String(o.co_ref_id) === String(newCoRefId)) ?? null;

    setDraft((d) => ({
      ...d,
      co_ref_id: opt?.co_ref_id ?? null,
      co_code: opt?.co_code ?? null,
      co_name: opt?.co_name ?? null,
      co_type: opt?.co_type ?? null,

      // reset leadership selection when affiliation changes
      reports_to_assignment_id: null,
    }));
  };

  const leadershipOptions = useMemo(() => {
    if (!masterRows || !masterRows.length) return [] as { value: string; label: string }[];

    const selectedCoRefId = norm(draft.co_ref_id);
    const selectedCoName = norm(draft.co_name);
    if (!selectedCoRefId && !selectedCoName) return [];

    const increasesWithSeniority = sortIncreasesWithSeniority(positionTitles);
    const childRank = getRankForTitle(positionTitle || "Technician", positionTitles);

    const matchesAffiliation = (r: any) => {
      const rCoRef = norm(r?.co_ref_id);
      if (selectedCoRefId && rCoRef && rCoRef === selectedCoRefId) return true;

      const rAff = norm(r?.affiliation ?? r?.co_name ?? r?.company_name ?? r?.contractor_name);
      if (selectedCoName && rAff && rAff.toLowerCase() === selectedCoName.toLowerCase()) return true;

      return false;
    };

    const isActive = (r: any) => {
      const end = norm(r?.end_date);
      const active = r?.active ?? r?.assignment_active ?? true;
      return Boolean(active) && !end;
    };

    const candidates = (masterRows as any[])
      .filter((r) => Boolean(norm(r?.assignment_id)))
      .filter(isActive)
      .filter(matchesAffiliation)
      .filter((r) => {
        const candTitle = norm(r?.position_title ?? r?.title);
        const candRank = getRankForTitle(candTitle, positionTitles);
        return increasesWithSeniority ? candRank > childRank : candRank < childRank;
      })
      .map((r) => {
        const aid = norm(r?.assignment_id);
        const name = norm(r?.full_name ?? r?.person_name ?? r?.name) || "—";
        const title = norm(r?.position_title ?? r?.title);
        return {
          value: aid,
          label: title ? `${name} — ${title}` : name,
        };
      })
      .filter((o) => Boolean(o.value))
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

    return candidates;
  }, [masterRows, draft.co_ref_id, draft.co_name, positionTitle, positionTitles]);

  // If exactly one leadership option exists, auto-select it (Step 3 default)
  useEffect(() => {
    if (!open) return;
    if (mode !== "new") return;

    const current = norm(draft.reports_to_assignment_id);
    if (current) return;

    if (leadershipOptions.length === 1) {
      setDraft((d) => ({ ...d, reports_to_assignment_id: leadershipOptions[0]?.value ?? null }));
    }
  }, [open, mode, leadershipOptions, draft.reports_to_assignment_id]);

  const instantAddExisting = useCallback(
    async (p: PersonHit) => {
      if (!open) return;
      if (disabled) return;

      const pid = norm(p.person_id);
      if (!pid) return;

      if (excludePersonIds?.has(pid)) {
        toast.push({
          title: "Already on roster",
          message: "This person already appears active for this org.",
          variant: "warning",
        });
        return;
      }

      const r = await upsertAndAddMembership({
        pcOrgId,
        positionTitle: positionTitle || "Technician",
        startAssignment,
        draft: {
          ...emptyDraft(),
          person_id: pid,
          full_name: p.full_name ?? "",
          emails: p.emails ?? "",
          mobile: p.mobile ?? "",
          fuse_emp_id: p.fuse_emp_id ?? "",
          person_nt_login: p.person_nt_login ?? "",
          person_csg_id: p.person_csg_id ?? "",
          person_notes: p.person_notes ?? "",
          active: typeof p.active === "boolean" ? p.active : null,
          co_ref_id: p.co_ref_id ?? null,
          co_code: p.co_code ?? null,
        },
      });

      if (!r.ok) {
        toast.push({ title: "Add failed", message: r.error, variant: "warning" });
        return;
      }

      toast.push({
        title: "Added",
        message: `${formatPersonTitle(p)} added to roster${startAssignment ? " + assigned" : ""}.`,
        variant: "success",
      });

      onAdded?.();
      onClose();
    },
    [open, disabled, excludePersonIds, onAdded, onClose, pcOrgId, toast, upsertAndAddMembership, positionTitle, startAssignment]
  );

  const onConfirmNew = useCallback(async () => {
    if (!open) return;
    if (!canSubmitNew) return;

    // New Person uses the waterfall (minimal blast radius; does not affect Pick Existing)
    const r = await addNewPersonWaterfall({
      pcOrgId,
      positionTitle: positionTitle || "Technician",
      startAssignment,
      draft,
    });

    if (!r.ok) {
      toast.push({ title: "Add failed", message: r.error, variant: "warning" });
      return;
    }

    toast.push({
      title: "Added",
      message: `${fullName || "Person"} added to roster${startAssignment ? " + assigned" : ""}.`,
      variant: "success",
    });

    onAdded?.();
    onClose();
  }, [open, canSubmitNew, draft, fullName, onAdded, onClose, pcOrgId, toast, addNewPersonWaterfall, positionTitle, startAssignment]);

  const looksLikeQ = buildLooksLikeQuery(draft, lob);

  const displayedResults = mode === "pick" ? pickSearch.results : looksLikeSearch.results;

  const displayedPersonIds = useMemo(() => {
    return (displayedResults ?? [])
      .map((r) => norm(r?.person_id))
      .filter(Boolean);
  }, [displayedResults]);

  const displayedPersonIdsKey = useMemo(() => displayedPersonIds.join("|"), [displayedPersonIds]);

  const displayedQuery = mode === "pick" ? pickSearch.query : looksLikeQ;
  const displayedLoading = mode === "pick" ? pickSearch.loading : looksLikeSearch.loading;
  const displayedError = mode === "pick" ? pickSearch.error : looksLikeSearch.error;

  useEffect(() => {
    if (!open) return;

    if (displayedPersonIds.length === 0) {
      setActiveOrgNameByPersonId(new Map());
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const orgByPerson = await fetchActiveMembershipOrgByPersonIds(supabase, displayedPersonIds);

        const orgIds = Array.from(new Set(Array.from(orgByPerson.values()).filter(Boolean)));
        if (orgIds.length === 0) {
          if (!cancelled) setActiveOrgNameByPersonId(new Map());
          return;
        }

        const { data, error } = await supabase.from("pc_org").select("pc_org_id, pc_org_name").in("pc_org_id", orgIds);
        if (error) throw error;

        const nameByOrgId = new Map<string, string>();
        for (const r of data ?? []) {
          const oid = norm((r as any)?.pc_org_id);
          const oname = norm((r as any)?.pc_org_name);
          if (oid) nameByOrgId.set(oid, oname || oid);
        }

        const out = new Map<string, string>();
        for (const [pid, oid] of orgByPerson.entries()) {
          const name = nameByOrgId.get(oid) ?? oid;
          if (pid && name) out.set(pid, name);
        }

        if (!cancelled) setActiveOrgNameByPersonId(out);
      } catch {
        if (!cancelled) setActiveOrgNameByPersonId(new Map());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, supabase, displayedPersonIdsKey, displayedPersonIds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onMouseDown={onClose}>
      <div
        className="fixed left-1/2 top-16 w-[min(980px,calc(100vw-24px))] -translate-x-1/2"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Add to roster</div>
              <div className="text-xs text-[var(--to-ink-muted)]">
                PC: <span className="text-[var(--to-ink)]">{title}</span>
                <span className="px-2">•</span>
                LOB: <span className="text-[var(--to-ink)]">{lobLabel(lob)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={onClose} disabled={saving}>
                Close
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="h-9 px-3 text-xs"
                onClick={onConfirmNew}
                disabled={mode !== "new" || !canSubmitNew}
                title={locked ? "Requires roster_manage (or owner)" : undefined}
              >
                {saving ? "Adding…" : "Confirm add"}
              </Button>
            </div>
          </div>

          {/* Practical: assignment controls */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--to-ink-muted)]">Position</span>

              <Select
                className="h-9 w-56"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                disabled={disabled || positionTitlesLoading}
                title={positionTitlesError ?? undefined}
              >
                {positionOptions.length === 0 ? (
                  <option value="Technician">Technician</option>
                ) : (
                  positionOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))
                )}
              </Select>

              {positionTitlesError ? (
                <span className="text-[10px] text-[var(--to-status-warning)]">{positionTitlesError}</span>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs text-[var(--to-ink-muted)]"
              onClick={() => !disabled && setStartAssignment((v) => !v)}
              disabled={disabled}
            >
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded border"
                style={{
                  borderColor: "var(--to-border)",
                  background: startAssignment ? "var(--to-surface-2)" : "transparent",
                  color: "var(--to-ink)",
                }}
              >
                {startAssignment ? "✓" : ""}
              </span>
              Start assignment after add
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* LEFT */}
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={mode === "pick" ? "secondary" : "ghost"}
                  className="h-9 px-3 text-xs"
                  disabled={disabled}
                  onClick={() => {
                    setMode("pick");
                    setDraft(emptyDraft());
                    pickSearch.clear();
                  }}
                >
                  Pick existing
                </Button>

                <Button
                  type="button"
                  variant={mode === "new" ? "secondary" : "ghost"}
                  className="h-9 px-3 text-xs"
                  disabled={disabled}
                  onClick={() => {
                    setMode("new");
                    setDraft(emptyDraft());
                    looksLikeSearch.clear();
                  }}
                >
                  New person
                </Button>
              </div>

              {mode === "pick" ? (
                <PersonSearch value={pickSearch.query} onChange={pickSearch.onQueryChange} disabled={disabled} />
              ) : (
                <div className="grid gap-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <TextInput
                      value={draft.full_name ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, full_name: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, full_name: v }, lob));
                      }}
                      placeholder="Full name"
                      className="h-10"
                      disabled={disabled}
                    />
                    <TextInput
                      value={draft.emails ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, emails: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, emails: v }, lob));
                      }}
                      placeholder="Emails (optional)"
                      className="h-10"
                      disabled={disabled}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <TextInput
                      value={(draft as any)?.tech_id ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, tech_id: e.target.value }))}
                      placeholder="Tech ID (optional)"
                      className="h-10"
                      disabled={disabled}
                    />
                    <Select
                      value={draft.office_id ? String(draft.office_id) : "none"}
                      onChange={(e) => setDraft((d) => ({ ...d, office_id: e.target.value === "none" ? null : e.target.value }))}
                      className="h-10"
                      disabled={disabled || officeLoading}
                      title={officeError ?? undefined}
                    >
                      <option value="none">{officeLoading ? "Loading offices…" : "Office (optional)"}</option>
                      {(officeOptions ?? []).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.sublabel ? `${o.label} — ${o.sublabel}` : o.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <TextInput
                      value={draft.mobile ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, mobile: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, mobile: v }, lob));
                      }}
                      placeholder="Mobile (optional)"
                      className="h-10"
                      disabled={disabled}
                    />
                    <TextInput
                      value={draft.fuse_emp_id ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, fuse_emp_id: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, fuse_emp_id: v }, lob));
                      }}
                      placeholder="Fuse Emp ID (optional)"
                      className="h-10"
                      disabled={disabled}
                    />
                  </div>

                  {lob !== "LOCATE" ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <TextInput
                        value={draft.person_nt_login ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraft((d) => ({ ...d, person_nt_login: v }));
                          looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, person_nt_login: v }, lob));
                        }}
                        placeholder="NT Login (optional)"
                        className="h-10"
                        disabled={disabled}
                      />
                      <TextInput
                        value={draft.person_csg_id ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraft((d) => ({ ...d, person_csg_id: v }));
                          looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, person_csg_id: v }, lob));
                        }}
                        placeholder="CSG ID (optional)"
                        className="h-10"
                        disabled={disabled}
                      />
                    </div>
                  ) : null}

                  <TextInput
                    value={draft.person_notes ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, person_notes: e.target.value }))}
                    placeholder="Notes (optional)"
                    className="h-10"
                    disabled={disabled}
                  />

                  <div className="grid gap-1">
                    <div className="text-xs text-[var(--to-ink-muted)]">Affiliation</div>
                    <Select
                      value={coKey}
                      onChange={(e) => onPickAffiliation(e.target.value)}
                      className="h-10"
                      disabled={disabled || coLoading}
                    >
                      <option value="none">{coLoading ? "Loading…" : "Select affiliation"}</option>
                      {(coOptions ?? []).map((o) => (
                        <option key={String(o.co_ref_id)} value={String(o.co_ref_id)}>
                          {String(o.co_name ?? "—")}
                        </option>
                      ))}
                    </Select>

                    {!fullName || !draft.co_ref_id ? (
                      <div className="text-xs text-[var(--to-ink-muted)]">Required: full name + affiliation.</div>
                    ) : null}
                  </div>

                  {/* Leadership (optional): defaults if exactly one candidate */}
                  <div className="grid gap-1">
                    <div className="text-xs text-[var(--to-ink-muted)]">Reports to (optional)</div>
                    <Select
                      value={draft.reports_to_assignment_id ? String(draft.reports_to_assignment_id) : "none"}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          reports_to_assignment_id: e.target.value === "none" ? null : e.target.value,
                        }))
                      }
                      className="h-10"
                      disabled={disabled || masterLoading}
                      title={masterErr ?? undefined}
                    >
                      <option value="none">
                        {masterLoading
                          ? "Loading leaders…"
                          : leadershipOptions.length
                            ? "Select leader (optional)"
                            : "No leader candidates"}
                      </option>
                      {leadershipOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    {leadershipOptions.length > 1 ? (
                      <div className="text-[10px] text-[var(--to-ink-muted)]">Multiple leaders found — leaving NULL unless you choose.</div>
                    ) : null}
                  </div>


                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Looks-like candidates</div>
                <div className="text-xs text-[var(--to-ink-muted)]">
                  {mode === "pick" ? "Based on your search" : "Based on what you typed"}
                </div>
              </div>

              <CandidatesList
                query={displayedQuery}
                loading={displayedLoading}
                error={displayedError}
                results={displayedResults}
                coOptions={coOptions}
                onAdd={instantAddExisting}
                disabled={disabled}
                activeOrgNameByPersonId={activeOrgNameByPersonId}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CandidatesList(props: {
  query: string;
  loading: boolean;
  error: string | null;
  results: PersonHit[];
  coOptions: CoOption[];
  onAdd: (p: PersonHit) => void;
  disabled: boolean;
  activeOrgNameByPersonId: Map<string, string>;
}) {
  const { query, loading, error, results, coOptions, onAdd, disabled, activeOrgNameByPersonId } = props;
  const q = String(query ?? "").trim();

  if (!q || q.length < 2)
    return <div className="text-xs text-[var(--to-ink-muted)]">Type 2+ characters to see candidates.</div>;
  if (loading) return <div className="text-xs text-[var(--to-ink-muted)]">Searching…</div>;
  if (error) return <div className="text-xs text-[var(--to-status-warning)]">{error}</div>;
  if (!results.length) return <div className="text-xs text-[var(--to-ink-muted)]">No matches.</div>;

  return (
    <div className="grid gap-2 max-h-[460px] overflow-auto pr-1">
      {results.map((p) => {
        const title = formatPersonTitle(p);
        const sub = formatPersonSubtitle(p);
        const aff = coLabelFor(p.co_ref_id ?? null, coOptions);

        const titleParts = markMatches(title, q);
        const subParts = markMatches(sub, q);

        const alreadyInOrgName = String(activeOrgNameByPersonId.get(String(p.person_id)) ?? "").trim();
        const alreadyAssigned = Boolean(alreadyInOrgName);

        return (
          <div key={p.person_id} className="rounded border border-[var(--to-border)] p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {titleParts.map((part, idx) =>
                      part.hit ? (
                        <mark key={idx} className="rounded px-0.5">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={idx}>{part.text}</span>
                      )
                    )}
                  </div>
                </div>

                <div className="text-xs text-[var(--to-ink-muted)]">
                  {subParts.map((part, idx) =>
                    part.hit ? (
                      <mark key={idx} className="rounded px-0.5">
                        {part.text}
                      </mark>
                    ) : (
                      <span key={idx}>{part.text}</span>
                    )
                  )}
                </div>

                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  Affiliation: <span className="text-[var(--to-ink)]">{aff}</span>
                  <span className="px-2">•</span>
                  Active:{" "}
                  <span className="text-[var(--to-ink)]">
                    {typeof p.active === "boolean" ? (p.active ? "Active" : "Inactive") : "—"}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="h-8 px-3 text-xs whitespace-nowrap"
                disabled={disabled || alreadyAssigned}
                onClick={() => void onAdd(p)}
                title={alreadyAssigned ? `Already active in ${alreadyInOrgName}` : undefined}
              >
                {alreadyAssigned ? alreadyInOrgName : "Add"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
