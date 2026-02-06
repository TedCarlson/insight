// apps/web/src/features/roster/add-to-roster/components/AddToRosterDrawer.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
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
import {
  usePersonSearch,
  type PersonHit,
} from "@/features/roster/add-to-roster/hooks/usePersonSearch";
import {
  formatPersonTitle,
  formatPersonSubtitle,
  markMatches,
} from "@/features/roster/add-to-roster/lib/personSearchFormat";

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
  };
}

function buildLooksLikeQuery(d: OnboardPersonDraft): string {
  const parts = [
    d.full_name,
    d.emails,
    d.mobile,
    d.fuse_emp_id,
    d.person_nt_login,
    d.person_csg_id,
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

  // ✅ hooks always called (no early return above these)
  const { saving, coLoading, coOptions, ensureCoOptions, upsertAndAddMembership } = useAddToRoster();
  const pickSearch = usePersonSearch({ excludePersonIds });
  const looksLikeSearch = usePersonSearch({ excludePersonIds });

  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [draft, setDraft] = useState<OnboardPersonDraft>(() => emptyDraft());

  const title = useMemo(() => pcOrgName ?? pcOrgId, [pcOrgName, pcOrgId]);
  const locked = !canEdit;
  const disabled = saving || locked;

  // Affiliation load is guarded; safe to call on render
  // ensureCoOptions prevents duplicate loads internally
  if (open) {
    void ensureCoOptions().catch(() => {});
  }

  const fullName = String(draft.full_name ?? "").trim();
  const emails = String(draft.emails ?? "").trim();
  const coKey = draft.co_ref_id ? String(draft.co_ref_id) : "none";
  const canSubmitNew = !disabled && Boolean(fullName) && Boolean(emails) && Boolean(draft.co_ref_id);

  const onPickAffiliation = useCallback(
    (newCoRefId: string) => {
      const opt = coOptions.find((o) => String(o.co_ref_id) === String(newCoRefId)) ?? null;

      setDraft((d) => ({
        ...d,
        co_ref_id: opt?.co_ref_id ?? null,
        co_code: opt?.co_code ?? null,
        co_name: opt?.co_name ?? null,
        co_type: opt?.co_type ?? null,
      }));
    },
    [coOptions]
  );

  const instantAddExisting = useCallback(
    async (p: PersonHit) => {
      if (!open) return;
      if (disabled) return;

      const pid = String(p.person_id ?? "").trim();
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
        positionTitle: "Technician", // internal only; not displayed in UI
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
        message: `${formatPersonTitle(p)} added to roster.`,
        variant: "success",
      });

      onAdded?.();
      onClose();
    },
    [open, disabled, excludePersonIds, onAdded, onClose, pcOrgId, toast, upsertAndAddMembership]
  );

  const onConfirmNew = useCallback(async () => {
    if (!open) return;
    if (!canSubmitNew) return;

    const r = await upsertAndAddMembership({
      pcOrgId,
      positionTitle: "Technician",
      draft,
    });

    if (!r.ok) {
      toast.push({ title: "Add failed", message: r.error, variant: "warning" });
      return;
    }

    toast.push({
      title: "Added",
      message: `${fullName || "Person"} added to roster.`,
      variant: "success",
    });

    onAdded?.();
    onClose();
  }, [open, canSubmitNew, draft, fullName, onAdded, onClose, pcOrgId, toast, upsertAndAddMembership]);

  const looksLikeQ = buildLooksLikeQuery(draft);

  // ✅ early return AFTER hooks
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
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, full_name: v }));
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
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, emails: v }));
                      }}
                      placeholder="Emails (comma-separated ok)"
                      className="h-10"
                      disabled={disabled}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <TextInput
                      value={draft.mobile ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, mobile: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, mobile: v }));
                      }}
                      placeholder="Mobile"
                      className="h-10"
                      disabled={disabled}
                    />
                    <TextInput
                      value={draft.fuse_emp_id ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, fuse_emp_id: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, fuse_emp_id: v }));
                      }}
                      placeholder="Fuse Emp ID"
                      className="h-10"
                      disabled={disabled}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <TextInput
                      value={draft.person_nt_login ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, person_nt_login: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, person_nt_login: v }));
                      }}
                      placeholder="NT Login"
                      className="h-10"
                      disabled={disabled}
                    />
                    <TextInput
                      value={draft.person_csg_id ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((d) => ({ ...d, person_csg_id: v }));
                        looksLikeSearch.onQueryChange(buildLooksLikeQuery({ ...draft, person_csg_id: v }));
                      }}
                      placeholder="CSG ID"
                      className="h-10"
                      disabled={disabled}
                    />
                  </div>

                  <TextInput
                    value={draft.person_notes ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, person_notes: e.target.value }))}
                    placeholder="Notes"
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

                    {!fullName || !emails || !draft.co_ref_id ? (
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        Required: full name + emails + affiliation.
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {locked ? (
                <div className="text-xs text-[var(--to-status-warning)]">
                  Locked: you need roster_manage permission (or owner) to add.
                </div>
              ) : null}
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
                query={mode === "pick" ? pickSearch.query : looksLikeQ}
                loading={mode === "pick" ? pickSearch.loading : looksLikeSearch.loading}
                error={mode === "pick" ? pickSearch.error : looksLikeSearch.error}
                results={mode === "pick" ? pickSearch.results : looksLikeSearch.results}
                coOptions={coOptions}
                onAdd={instantAddExisting}
                disabled={disabled}
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
}) {
  const { query, loading, error, results, coOptions, onAdd, disabled } = props;
  const q = String(query ?? "").trim();

  if (!q || q.length < 2) return <div className="text-xs text-[var(--to-ink-muted)]">Type 2+ characters to see candidates.</div>;
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

        return (
          <div key={p.person_id} className="rounded border border-[var(--to-border)] p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
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
                disabled={disabled}
                onClick={() => void onAdd(p)}
              >
                Add
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}