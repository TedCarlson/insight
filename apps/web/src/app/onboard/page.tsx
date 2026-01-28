// apps/web/src/app/onboard/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { api, type PersonRow } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/state/org";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";

import { DataTable, DataTableHeader, DataTableBody, DataTableRow } from "@/components/ui/DataTable";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

type CoRefKind = "company" | "contractor";
type CoRefOption = {
  kind: CoRefKind;
  id: string;
  name: string;
  code: string | null;
};

type SelectOption = { value: string; label: string };

function safeName(p: PersonRow | null | undefined) {
  return (p?.full_name ?? (p as any)?.first_name ?? (p as any)?.last_name ?? "—") as string;
}

function digitsOnly(v: string | null | undefined) {
  return String(v ?? "")
    .replace(/\D/g, "")
    .trim();
}

function formatPhoneFromDigits(d: string) {
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    const t = d.slice(1);
    return `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6)}`;
  }
  return d || "—";
}

function normalizeNameKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function pillClassName() {
  // identical sizing for "Add" + status pills
  return "h-7 px-3 rounded-full text-xs font-medium";
}

type PersonEditDraft = {
  full_name?: string;
  emails?: string;
  mobile?: string;
  fuse_emp_id?: string;
  person_notes?: string;
  person_nt_login?: string;
  person_csg_id?: string;
  active?: boolean;
  co_ref_id?: string | null;
};

type RpcLog = {
  at: string;
  action: string;
  message: string;
  status?: number;
  code?: string;
  details?: any;
  debug?: any;
};

type ExitSaveState =
  | { state: "idle" }
  | { state: "saving"; at: string }
  | { state: "success"; at: string; result: any }
  | { state: "failed"; at: string; result: any };

export default function OnboardPage() {
  const router = useRouter();
  const { selectedOrgId, orgs, orgsLoading } = useOrg();

  const supabase = useMemo(() => createClient(), []);

  const validatedOrgId = useMemo(() => {
    if (orgsLoading) return null;
    if (!selectedOrgId) return null;
    return orgs.some((o: any) => String(o.pc_org_id) === String(selectedOrgId)) ? selectedOrgId : null;
  }, [selectedOrgId, orgs, orgsLoading]);

  const selectedOrgName = useMemo(() => {
    if (!validatedOrgId) return null;
    const hit = (orgs as any[]).find((o: any) => String(o.pc_org_id) === String(validatedOrgId));
    return (hit?.pc_org_name ?? hit?.org_name ?? hit?.name ?? null) as string | null;
  }, [orgs, validatedOrgId]);

  // Affiliation lookup (combined list from company + contractor)
  const [coRefById, setCoRefById] = useState<Map<string, CoRefOption>>(new Map());
  const [coRefIdByNameKey, setCoRefIdByNameKey] = useState<Map<string, string>>(new Map());
  const [affiliationOptions, setAffiliationOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAffiliationOptions() {
      try {
        const [{ data: companies, error: cErr }, { data: contractors, error: kErr }] = await Promise.all([
          supabase.from("company_admin_v").select("company_id, company_name, company_code").order("company_name"),
          supabase.from("contractor_admin_v").select("contractor_id, contractor_name, contractor_code").order("contractor_name"),
        ]);

        if (cErr) throw cErr;
        if (kErr) throw kErr;

        const byId = new Map<string, CoRefOption>();
        const byName = new Map<string, string>();
        const opts: SelectOption[] = [];

        for (const c of companies ?? []) {
          const id = String((c as any).company_id ?? "").trim();
          if (!id) continue;
          const name = String((c as any).company_name ?? "").trim() || "—";
          const code = ((c as any).company_code ?? null) as string | null;

          byId.set(id, { kind: "company", id, name, code });

          const key = normalizeNameKey(name);
          if (key && !byName.has(key)) byName.set(key, id);

          opts.push({ value: id, label: name });
        }

        for (const k of contractors ?? []) {
          const id = String((k as any).contractor_id ?? "").trim();
          if (!id) continue;
          const name = String((k as any).contractor_name ?? "").trim() || "—";
          const code = ((k as any).contractor_code ?? null) as string | null;

          byId.set(id, { kind: "contractor", id, name, code });

          const key = normalizeNameKey(name);
          if (key && !byName.has(key)) byName.set(key, id);

          opts.push({ value: id, label: name });
        }

        if (!cancelled) {
          setCoRefById(byId);
          setCoRefIdByNameKey(byName);
          setAffiliationOptions(opts);
        }
      } catch {
        // silent; affiliation can still be typed & saved by id if present
      }
    }

    void loadAffiliationOptions();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [rows, setRows] = useState<PersonRow[]>([]);

  // Hydration: replace partial search rows with full rows from public.person_admin_v
  const [hydrating, setHydrating] = useState(false);
  const hydrateRunRef = useRef(0);

  const [rpcLog, setRpcLog] = useState<RpcLog | null>(null);

  const [editMode, setEditMode] = useState(false);

  const [draftByPersonId, setDraftByPersonId] = useState<Map<string, PersonEditDraft>>(new Map());
  const [savingByPersonId, setSavingByPersonId] = useState<Map<string, boolean>>(new Map());

  const [affDraftByPersonId, setAffDraftByPersonId] = useState<Map<string, string>>(new Map());
  const [onboardSendingByPersonId, setOnboardSendingByPersonId] = useState<Map<string, boolean>>(new Map());

  const [exitSave, setExitSave] = useState<ExitSaveState>({ state: "idle" });

  useEffect(() => {
    if (!editMode) {
      setDraftByPersonId(new Map());
      setAffDraftByPersonId(new Map());
    }
  }, [editMode]);

  function setDraft(pid: string, patch: PersonEditDraft) {
    setDraftByPersonId((prev) => {
      const n = new Map(prev);
      const cur = n.get(pid) ?? {};
      n.set(pid, { ...cur, ...patch });
      return n;
    });
  }

  function clearDraftKeys(pid: string, keys?: (keyof PersonEditDraft)[]) {
    setDraftByPersonId((prev) => {
      const n = new Map(prev);
      const cur = n.get(pid);
      if (!cur) return n;

      if (!keys || keys.length === 0) {
        n.delete(pid);
        return n;
      }

      const next: PersonEditDraft = { ...cur };
      for (const k of keys) delete (next as any)[k];

      if (Object.keys(next).length === 0) n.delete(pid);
      else n.set(pid, next);

      return n;
    });
  }

  function logRpc(action: string, err: any) {
    setRpcLog({
      at: new Date().toISOString(),
      action,
      message: String(err?.message ?? err),
      status: err?.status,
      code: err?.code,
      details: err?.details ?? null,
      debug: err?.debug ?? null,
    });
  }

  async function savePersonPatch(pid: string, patch: PersonEditDraft, opts?: { silent?: boolean; clearAll?: boolean }) {
    const person_id = String(pid).trim();
    if (!person_id) return { ok: true };

    const providedKeys = Object.keys(patch ?? {}) as (keyof PersonEditDraft)[];

    // Always send full_name so person_upsert can't trip NOT NULL on insert paths
    const currentRow = rows.find((r) => String((r as any).person_id) === person_id) as any;
    const currentFullName = String(currentRow?.full_name ?? "").trim();
    const patchedFullName = typeof patch.full_name === "string" ? patch.full_name.trim() : "";
    const full_name_to_send = patchedFullName || currentFullName;

    if (!full_name_to_send) {
      if (!opts?.silent) setNotice("Full name is required.");
      return { ok: false, error: { message: "Full name is required." } };
    }

    setSavingByPersonId((prev) => {
      const n = new Map(prev);
      n.set(person_id, true);
      return n;
    });

    try {
      if (!opts?.silent) {
        setNotice(null);
        setRpcLog(null);
      }

      const updated = await api.personUpsert({
        person_id,
        full_name: full_name_to_send,
        emails: patch.emails,
        mobile: patch.mobile,
        fuse_emp_id: patch.fuse_emp_id,
        person_notes: patch.person_notes,
        person_nt_login: patch.person_nt_login,
        person_csg_id: patch.person_csg_id,
        active: patch.active,
        co_ref_id: patch.co_ref_id ?? undefined,
      });

      if (updated) {
        setRows((prev) =>
          prev.map((r) =>
            String((r as any).person_id) === person_id ? ({ ...(r as any), ...(updated as any) } as any) : r
          )
        );
      }

      if (opts?.clearAll) clearDraftKeys(person_id);
      else clearDraftKeys(person_id, providedKeys);

      return { ok: true };
    } catch (e: any) {
      if (!opts?.silent) {
        setNotice(e?.message ?? "Failed to save person");
        logRpc("person_upsert", e);
      }
      return { ok: false, error: e };
    } finally {
      setSavingByPersonId((prev) => {
        const n = new Map(prev);
        n.delete(person_id);
        return n;
      });
    }
  }

  const hydratePeople = useCallback(
    async (nextRows: PersonRow[]) => {
      const runId = ++hydrateRunRef.current;
      const ids = (nextRows ?? [])
        .map((r) => String((r as any)?.person_id ?? "").trim())
        .filter(Boolean);

      if (ids.length === 0) return;

      setHydrating(true);

      try {
        // Full read model: public.person_admin_v
        const { data, error } = await supabase.from("person_admin_v").select("*").in("person_id", ids);

        // If a newer hydration run started, ignore this result.
        if (runId !== hydrateRunRef.current) return;

        if (error) throw error;

        const byId = new Map<string, any>();
        for (const row of (data as any[]) ?? []) {
          const id = String((row as any)?.person_id ?? "").trim();
          if (!id) continue;
          byId.set(id, row);
        }

        setRows((prev) =>
          prev.map((r) => {
            const id = String((r as any)?.person_id ?? "").trim();
            const full = id ? byId.get(id) : null;
            return full ? ({ ...(r as any), ...(full as any) } as any) : r;
          })
        );
      } catch (e: any) {
        // Hydration errors should not wipe results; surface as a notice for debugging.
        setNotice(e?.message ?? "Failed to hydrate person fields");
      } finally {
        // Only clear if this run is still the latest
        if (runId === hydrateRunRef.current) setHydrating(false);
      }
    },
    [supabase]
  );

  const loadPeople = useCallback(
    async (nextQuery: string) => {
      const q = (nextQuery ?? "").trim();
      setLoading(true);
      setNotice(null);

      try {
        const r = (await api.peopleGlobalUnassignedSearch(q, 100)) ?? [];
        const base = r.slice(0, 50);
        setRows(base);
        void hydratePeople(base);
      } catch (e: any) {
        setRows([]);
        setNotice(e?.message ?? "Failed to load people");
      } finally {
        setLoading(false);
      }
    },
    [hydratePeople]
  );

  useEffect(() => {
    const t = setTimeout(() => loadPeople(query), 250);
    return () => clearTimeout(t);
  }, [query, validatedOrgId, loadPeople]);


function handleAddPerson() {
    setNotice("Add person is not wired yet.");
  }

  async function handleRowOnboard(row: PersonRow) {
    if (!validatedOrgId) {
      setNotice("Select a scoped PC Org first.");
      return;
    }

    const pid = String((row as any).person_id ?? "").trim();
    if (!pid) {
      setNotice("Missing person_id.");
      return;
    }

    // Disable Add while editing is ON
    if (editMode || exitSave.state === "saving") return;

    if (Boolean(onboardSendingByPersonId.get(pid))) return;

    const active = ((row as any).active !== false) === true;
    if (!active) {
      setNotice("Person is inactive. Set status to Active before onboarding.");
      return;
    }

    const coRefId = String((row as any).co_ref_id ?? "").trim();
    if (!coRefId) {
      setNotice("Set affiliation (Company/Contractor) before onboarding.");
      return;
    }

    setOnboardSendingByPersonId((prev) => {
      const n = new Map(prev);
      n.set(pid, true);
      return n;
    });

    try {
      setNotice(null);
      setRpcLog(null);

      const start_date = new Date().toISOString().slice(0, 10);

      await api.wizardProcessToRoster({
        pc_org_id: String(validatedOrgId),
        person_id: pid,
        start_date,
      });

      setRows((prev) => prev.filter((r) => String((r as any).person_id) !== pid));
      await loadPeople(query);
    } catch (e: any) {
      setNotice(e?.message ?? "Failed to add membership");
      logRpc("wizard_process_to_roster", e);
    } finally {
      setOnboardSendingByPersonId((prev) => {
        const n = new Map(prev);
        n.delete(pid);
        return n;
      });
    }
  }

  async function saveAffiliationById(person_id: string, co_ref_id: string | null) {
    const pid = String(person_id).trim();
    const next = co_ref_id ? String(co_ref_id).trim() : null;
    await savePersonPatch(pid, { co_ref_id: next });
  }

  async function saveAffiliationByName(person_id: string, nameValue: string) {
    const pid = String(person_id).trim();
    const name = (nameValue ?? "").trim();
    const key = normalizeNameKey(name);
    const resolvedId = key ? coRefIdByNameKey.get(key) : undefined;

    if (!resolvedId) {
      setNotice("Affiliation not recognized. Choose from the dropdown or type an exact Company/Contractor name.");
      return;
    }

    await saveAffiliationById(pid, resolvedId);
  }

  function getAffiliationLabel(row: PersonRow) {
    const id = String((row as any).co_ref_id ?? "").trim();
    if (!id) return "";
    const opt = coRefById.get(id);
    return opt?.name ?? "";
  }

  const onboardGridStyle = useMemo(
    () => ({
      gridTemplateColumns: [
        "6.75rem",
        "7.25rem",
        "minmax(12rem,1.2fr)",
        "minmax(14rem,1.4fr)",
        "10rem",
        "7ch",
        "12ch",
        "9ch",
        "minmax(16rem,1.6fr)",
        "minmax(12rem,1.4fr)",
      ].join(" "),
    }),
    []
  );

  function getDraft(pid: string) {
    return draftByPersonId.get(pid) ?? {};
  }

  function isSaving(pid: string) {
    return Boolean(savingByPersonId.get(pid));
  }

  function currentValue(pid: string, row: any, key: keyof PersonEditDraft) {
    const d = getDraft(pid) as any;
    const fromDraft = d?.[key];
    if (typeof fromDraft !== "undefined") return fromDraft;
    return (row as any)?.[key] ?? "";
  }

  async function handleToggleEditMode() {
    // Turning ON is just a UI mode toggle.
    if (!editMode) {
      setEditMode(true);
      return;
    }

    // Turning OFF must commit all pending drafts (including unblurred inputs).
    const pending = Array.from(draftByPersonId.entries());
    if (pending.length === 0) {
      setEditMode(false);
      setExitSave({ state: "success", at: new Date().toISOString(), result: { ok: true, saved: 0 } });
      return;
    }

    setExitSave({ state: "saving", at: new Date().toISOString() });
    setNotice(null);
    setRpcLog(null);

    const results: any[] = [];
    let failed_count = 0;

    for (const [pid, patch] of pending) {
      const r = await savePersonPatch(pid, patch, { silent: true, clearAll: true });
      if (!r.ok) failed_count += 1;
      results.push({
        person_id: pid,
        ok: r.ok,
        error: r.ok ? null : { status: (r as any)?.error?.status, details: (r as any)?.error?.details ?? null, debug: (r as any)?.error?.debug ?? null },
      });
    }

    const payload = { ok: failed_count === 0, saved: pending.length, failed_count, results };

    if (failed_count === 0) {
      setEditMode(false);
      setExitSave({ state: "success", at: new Date().toISOString(), result: payload });
      await loadPeople(query);
    } else {
      setExitSave({ state: "failed", at: new Date().toISOString(), result: payload });
      setNotice("One or more rows failed to save. See details below.");
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Onboard"
        subtitle="Unassigned only — set affiliation, set active status, then add."
        actions={
          <Button variant="secondary" type="button" onClick={() => router.push("/roster")}>
            Roster
          </Button>
        }
      />

      {!validatedOrgId ? (
        <Card className="p-4 space-y-3">
          <Notice variant="warning" title="No scoped org selected">
            Select a PC Org in the header to continue. Org scope is inherited across the app.
          </Notice>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={() => router.push("/roster")}>
              Go to Roster
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-[var(--to-ink-muted)]">Scoped PC Org</div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">{selectedOrgName ?? "—"}</div>
                <Badge>{String(validatedOrgId).slice(0, 8)}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant={editMode ? "secondary" : "ghost"} type="button" onClick={handleToggleEditMode} disabled={exitSave.state === "saving"}>
                {editMode ? "Editing: On" : "Editing: Off"}
              </Button>

              <Button
                onClick={handleAddPerson}
                disabled={editMode || exitSave.state === "saving"}
                title={editMode ? "Finish editing (or turn Editing: Off) before adding." : undefined}
              >
                + Add person
              </Button>
            </div>
          </Card>

          {exitSave.state !== "idle" ? (
            <Card className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">
                  {exitSave.state === "saving" ? "Saving…" : exitSave.state === "success" ? "Saved ✅" : "Failed ❌"}
                </div>
                {"at" in exitSave && exitSave.at ? (
                  <div className="text-xs text-[var(--to-ink-muted)]">{new Date(exitSave.at).toLocaleString()}</div>
                ) : null}
              </div>

              {"result" in exitSave && exitSave.result ? (
                <pre className="mt-2 max-h-56 overflow-auto rounded bg-[var(--to-surface-2)] p-2 text-xs">
{JSON.stringify(exitSave.result, null, 2)}
                </pre>
              ) : null}
            </Card>
          ) : null}

          <Toolbar
            left={
              <div className="flex items-center gap-2 w-full">
                <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…" className="w-full" />
                <Button variant="ghost" onClick={() => loadPeople(query)} disabled={loading}>
                  Refresh
                </Button>
                {hydrating ? <div className="text-xs text-[var(--to-ink-muted)]">Hydrating…</div> : null}
              </div>
            }
          />

          {notice ? (
            <Notice variant="danger" title="Notice">
              <div className="space-y-2">
                <div>{notice}</div>

                {rpcLog ? (
                  <div className="rounded-md border border-[var(--to-border)] p-2 bg-[var(--to-surface-2)]">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">Write debug ({rpcLog.action})</div>
                      <button type="button" className="text-xs underline" onClick={() => setRpcLog(null)} title="Clear debug">
                        clear
                      </button>
                    </div>
                    <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(rpcLog, null, 2)}</pre>
                  </div>
                ) : null}
              </div>
            </Notice>
          ) : null}

          {loading ? (
            <Card className="p-6">
              <div className="text-sm text-[var(--to-ink-muted)]">Loading…</div>
            </Card>
          ) : rows.length === 0 ? (
            <EmptyState title="No results" message="Try a different search query." />
          ) : (
              <DataTable
                zebra
                hover
                layout="content"
                gridClassName="w-full min-w-[70rem] lg:min-w-0"
                gridStyle={onboardGridStyle as any}
              >

              <DataTableHeader>
                <div>Add</div>
                <div>Status</div>
                <div>Full name</div>
                <div>Emails</div>
                <div>Mobile</div>
                <div>Fuse</div>
                <div>NT</div>
                <div>CSG</div>
                <div>Affiliation</div>
                <div>Notes</div>
              </DataTableHeader>

              <DataTableBody>
                {rows.map((row) => {
                  const pid = String((row as any).person_id ?? "").trim();
                  const saving = isSaving(pid);
                  const onboardSending = Boolean(onboardSendingByPersonId.get(pid));
                  const draft = getDraft(pid) as any;

                  const mobileRaw =
                    (draft?.mobile ?? (row as any)?.mobile ?? (row as any)?.phone ?? (row as any)?.mobile_phone ?? "") as string;

                  const mobileDigits = digitsOnly(mobileRaw);
                  const mobile = mobileDigits ? formatPhoneFromDigits(mobileDigits) : "—";

                  const emails = String((draft?.emails ?? (row as any)?.emails ?? (row as any)?.email ?? "") ?? "").trim() || "—";

                  const fuse = String((draft?.fuse_emp_id ?? (row as any)?.fuse_emp_id ?? "") ?? "").trim() || "—";
                  const nt = String((draft?.person_nt_login ?? (row as any)?.person_nt_login ?? "") ?? "").trim() || "—";
                  const csg = String((draft?.person_csg_id ?? (row as any)?.person_csg_id ?? "") ?? "").trim() || "—";

                  const notes = String((draft?.person_notes ?? (row as any)?.person_notes ?? "") ?? "").trim() || "—";

                  const active = ((draft?.active ?? (row as any)?.active) !== false) === true;

                  const affiliationLabel = getAffiliationLabel(row);
                  const currentAff = String((draft?.co_ref_id ?? (row as any)?.co_ref_id ?? "") ?? "").trim();

                  return (
                    <DataTableRow key={pid}>
                      <div>
                        <Button
                          className={pillClassName()}
                          type="button"
                          variant="secondary"
                          onClick={() => handleRowOnboard(row)}
                          disabled={editMode || exitSave.state === "saving" || saving || onboardSending}
                          title={editMode ? "Finish editing first." : undefined}
                        >
                          {onboardSending ? "Adding…" : "Add"}
                        </Button>
                      </div>

                      <div>
                        <button
                          type="button"
                          className={`${pillClassName()} ${
                            active ? "bg-[var(--to-success-soft)] text-[var(--to-success-ink)]" : "bg-[var(--to-danger-soft)] text-[var(--to-danger-ink)]"
                          }`}
                          onClick={async () => {
                            if (editMode || exitSave.state === "saving") return;
                            if (!pid) return;
                            setDraft(pid, { active: !active });
                            await savePersonPatch(pid, { active: !active });
                          }}
                          disabled={editMode || exitSave.state === "saving" || saving}
                        >
                          {active ? "Active" : "Inactive"}
                        </button>
                      </div>

                      <div>
                        {editMode ? (
                          <TextInput
                            value={String(currentValue(pid, row as any, "full_name") ?? "")}
                            onChange={(e) => setDraft(pid, { full_name: e.target.value })}
                            onBlur={() => {
                              const v = String((draftByPersonId.get(pid) as any)?.full_name ?? "");
                              void savePersonPatch(pid, { full_name: v });
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <div className="text-sm">{safeName(row)}</div>
                        )}
                      </div>

                      <div>
                        {editMode ? (
                          <TextInput
                            value={String(currentValue(pid, row as any, "emails") ?? "")}
                            onChange={(e) => setDraft(pid, { emails: e.target.value })}
                            onBlur={() => {
                              const v = String((draftByPersonId.get(pid) as any)?.emails ?? "");
                              void savePersonPatch(pid, { emails: v });
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <div className="text-sm">{emails}</div>
                        )}
                      </div>

                      <div>
                        {editMode ? (
                          <TextInput
                            value={String(currentValue(pid, row as any, "mobile") ?? "")}
                            onChange={(e) => setDraft(pid, { mobile: e.target.value })}
                            onBlur={() => {
                              const v = String((draftByPersonId.get(pid) as any)?.mobile ?? "");
                              void savePersonPatch(pid, { mobile: v });
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <div className="text-sm">{mobile}</div>
                        )}
                      </div>

                      <div>
                        {editMode ? (
                          <TextInput
                            value={String(currentValue(pid, row as any, "fuse_emp_id") ?? "")}
                            onChange={(e) => setDraft(pid, { fuse_emp_id: e.target.value })}
                            onBlur={() => {
                              const v = String((draftByPersonId.get(pid) as any)?.fuse_emp_id ?? "");
                              void savePersonPatch(pid, { fuse_emp_id: v });
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <div className="text-sm">{fuse}</div>
                        )}
                      </div>

                      <div>
                        {editMode ? (
                          <TextInput
                            value={String(currentValue(pid, row as any, "person_nt_login") ?? "")}
                            onChange={(e) => setDraft(pid, { person_nt_login: e.target.value })}
                            onBlur={() => {
                              const v = String((draftByPersonId.get(pid) as any)?.person_nt_login ?? "");
                              void savePersonPatch(pid, { person_nt_login: v });
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <div className="text-sm">{nt}</div>
                        )}
                      </div>

                      <div>
                        {editMode ? (
                          <TextInput
                            value={String(currentValue(pid, row as any, "person_csg_id") ?? "")}
                            onChange={(e) => setDraft(pid, { person_csg_id: e.target.value })}
                            onBlur={() => {
                              const v = String((draftByPersonId.get(pid) as any)?.person_csg_id ?? "");
                              void savePersonPatch(pid, { person_csg_id: v });
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <div className="text-sm">{csg}</div>
                        )}
                      </div>

                      <div>
                        {editMode ? (
                          <Select
                            value={currentAff}
                            onChange={async (e: any) => {
                              const next = String(e.target.value ?? "").trim();
                              setDraft(pid, { co_ref_id: next || null });
                              await saveAffiliationById(pid, next || null);
                            }}
                            disabled={saving}
                          >
                            <option value="">—</option>
                            {affiliationOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </Select>

                        ) : (
                          <div className="text-sm">{affiliationLabel || "—"}</div>
                        )}
                      </div>

                      <div>
                        {editMode ? (
                          <TextInput
                            value={String(currentValue(pid, row as any, "person_notes") ?? "")}
                            onChange={(e) => setDraft(pid, { person_notes: e.target.value })}
                            onBlur={() => {
                              const v = String((draftByPersonId.get(pid) as any)?.person_notes ?? "");
                              void savePersonPatch(pid, { person_notes: v });
                            }}
                            disabled={saving}
                          />
                        ) : (
                          <div className="text-sm">{notes}</div>
                        )}
                      </div>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </>
      )}
    </PageShell>
  );
}
