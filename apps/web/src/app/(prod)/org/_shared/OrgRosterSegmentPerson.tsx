//apps/web/src/app/(prod)/org/_shared/OrgRosterSegmentPerson.tsx

"use client";

import { useMemo, useState } from "react";
import type { MasterRosterRow } from "./OrgRosterPanel";
import { createPerson } from "@/app/(prod)/person/person.api";
import type { PersonRow } from "@/app/(prod)/person/person.types";
import { toBtnNeutral } from "../../_shared/toStyles";

type UnassignedPerson = {
  person_id: string;
  full_name: string;
  emails?: string | null;
};

type PersonMode = "select" | "create";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Pill(props: { children: React.ReactNode; tone?: "neutral" | "warn" | "ok" }) {
  const { children, tone = "neutral" } = props;

  const toneClass =
    tone === "warn"
      ? "border-[var(--to-border)] bg-[var(--to-amber-100)] text-[var(--to-ink)]"
      : tone === "ok"
      ? "border-[var(--to-border)] bg-[var(--to-green-100)] text-[var(--to-ink)]"
      : "border-[var(--to-border)] bg-[var(--to-surface-2)] text-[var(--to-ink)]";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", toneClass)}>
      {children}
    </span>
  );
}

async function fetchJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    const text = await res.text().catch(() => "");
    const preview = (text || "").slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `API returned non-JSON (${res.status} ${res.statusText}). ` +
        `This usually means a wrong route or redirect. Preview: ${preview || "—"}`
    );
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error((json && (json.error || json.message)) || `Request failed (${res.status})`);
  }
  return json;
}

export function OrgRosterSegmentPerson(props: {
  isAdd: boolean;
  row?: MasterRosterRow | null;

  selectedPersonId: string;
  onSelectPersonId: (personId: string) => void;

  // When a person is created, we bubble it up so overlay can show label if desired.
  onCreatedPerson?: (row: PersonRow) => void;

  // surface errors to overlay
  onError: (msg: string | null) => void;

  // global busy flag from overlay (assignment save etc.)
  saving: boolean;

  // TODO(grants): replace w/ real grants later
  canCreatePerson?: boolean;
}) {
  const { isAdd, row, selectedPersonId, onSelectPersonId, onCreatedPerson, onError, saving } = props;
  const canCreatePerson = props.canCreatePerson ?? true;

  const [mode, setMode] = useState<PersonMode>("select");

  // search/select
  const [q, setQ] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [people, setPeople] = useState<UnassignedPerson[]>([]);

  // create flow
  const [creating, setCreating] = useState(false);
  const [dupMatches, setDupMatches] = useState<PersonRow[] | null>(null);
  const [allowDuplicateFuse, setAllowDuplicateFuse] = useState(false);

  const [draft, setDraft] = useState({
    full_name: "",
    emails: "",
    mobile: "",
    fuse_emp_id: "",
    person_nt_login: "",
    person_csg_id: "",
    person_notes: "",
    role: "",
  });

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return (people || []).find((p) => p.person_id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  async function loadPeople(search: string) {
    setLoadingPeople(true);
    onError(null);
    try {
      const params = new URLSearchParams();
      params.set("q", search);
      const json = await fetchJson<{ ok: boolean; people: UnassignedPerson[]; error?: string }>(
        `/api/org/unassigned?${params.toString()}`,
        { method: "GET" }
      );
      if (!json.ok) throw new Error(json.error || "Failed to load people");
      setPeople(json.people || []);
    } catch (e: any) {
      setPeople([]);
      onError(e?.message || "Failed to load people");
    } finally {
      setLoadingPeople(false);
    }
  }

  function startCreateFromSearch() {
    if (!canCreatePerson) return;
    onError(null);
    setDupMatches(null);
    setAllowDuplicateFuse(false);
    setDraft((d) => ({ ...d, full_name: d.full_name || q.trim() }));
    setMode("create");
  }

  async function doCreatePerson() {
    if (!canCreatePerson) return;
    onError(null);
    setCreating(true);
    try {
      const full = draft.full_name.trim();
      if (!full) throw new Error("Full name is required to create a person.");

      const result = await createPerson(
        {
          full_name: full,
          emails: draft.emails.trim() || null,
          mobile: draft.mobile.trim() || null,
          fuse_emp_id: draft.fuse_emp_id.trim() || null,
          person_nt_login: draft.person_nt_login.trim() || null,
          person_csg_id: draft.person_csg_id.trim() || null,
          person_notes: draft.person_notes.trim() || null,
          role: draft.role.trim() || null,
          active: true,
          co_ref_id: null,
        },
        { allowDuplicateFuse }
      );

      if (result.type === "duplicate") {
        setDupMatches(result.matches || []);
        return;
      }

      // created
      setDupMatches(null);
      onSelectPersonId(result.row.person_id);
      onCreatedPerson?.(result.row);

      // reset search list to avoid confusing "unassigned" list
      setPeople([]);
      setQ("");
      setMode("select");
    } catch (e: any) {
      onError(e?.message || "Create person failed");
    } finally {
      setCreating(false);
    }
  }

  const busy = saving || creating;

  if (!isAdd) {
    // edit mode: read-only person summary
    return (
      <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-[var(--to-ink)]">Person</div>
          <Pill>Read-only</Pill>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Name</div>
            <div className="font-medium text-[var(--to-ink)]">{row?.full_name || "—"}</div>
          </div>

          <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Mobile</div>
            <div className="font-medium text-[var(--to-ink)]">{row?.mobile || "—"}</div>
          </div>

          <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm md:col-span-2">
            <div className="text-xs text-[var(--to-ink-muted)]">Company / Contractor</div>
            <div className="font-medium text-[var(--to-ink)]">{row?.co_name || row?.co_code || "—"}</div>
          </div>
        </div>
      </section>
    );
  }

  const showCreateAffordance =
    canCreatePerson && mode === "select" && !loadingPeople && people.length === 0 && q.trim().length > 0;

  return (
    <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
      {/* Segment header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-[var(--to-ink)]">Person</div>
          {selectedPersonId ? <Pill tone="ok">Selected</Pill> : <Pill>Required</Pill>}
        </div>

        {mode === "create" ? (
          <button
            className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
            type="button"
            onClick={() => {
              setMode("select");
              setDupMatches(null);
              setAllowDuplicateFuse(false);
            }}
            disabled={busy}
          >
            Back to search
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {mode === "select" ? (
          <>
            {/* Search row */}
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                placeholder="Search unassigned people…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={busy}
              />
              <button
                className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
                type="button"
                onClick={() => loadPeople(q)}
                disabled={loadingPeople || busy}
              >
                {loadingPeople ? "Searching…" : "Search"}
              </button>
            </div>

            {/* Results */}
            <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)]">
              {people.length === 0 ? (
                <div className="px-3 py-3 text-sm text-[var(--to-ink-muted)]">
                  {loadingPeople ? "Loading…" : q.trim() ? "No results." : "Search to find unassigned people."}
                </div>
              ) : (
                <ul className="max-h-64 overflow-auto divide-y divide-[var(--to-border)]">
                  {people.map((p) => (
                    <li
                      key={p.person_id}
                      className="px-3 py-2 transition hover:bg-[var(--to-surface-2)]"
                    >
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          name="person"
                          className="mt-1"
                          checked={selectedPersonId === p.person_id}
                          onChange={() => onSelectPersonId(p.person_id)}
                          disabled={busy}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[var(--to-ink)]">{p.full_name}</div>
                          {p.emails ? (
                            <div className="truncate text-xs text-[var(--to-ink-muted)]">{p.emails}</div>
                          ) : null}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Create CTA */}
            {showCreateAffordance ? (
              <div className="flex flex-col gap-2 rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-[var(--to-ink-muted)]">
                  No unassigned person found. You can create a new person record.
                </div>
                <button
                  className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
                  type="button"
                  onClick={startCreateFromSearch}
                  disabled={busy}
                >
                  + Create new person
                </button>
              </div>
            ) : null}

            {selectedPerson ? (
              <div className="text-sm text-[var(--to-ink-muted)]">
                Selected: <span className="font-medium text-[var(--to-ink)]">{selectedPerson.full_name}</span>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--to-ink)]">Create Person</div>
                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  Creates a new person record, then you can assign them to this org.
                </div>
              </div>
              {creating ? <Pill tone="ok">Creating…</Pill> : <Pill>Draft</Pill>}
            </div>

            {/* Duplicate advisory */}
            {dupMatches && dupMatches.length > 0 ? (
              <div className="mt-3 rounded-md border border-[var(--to-border)] bg-[var(--to-amber-100)] px-3 py-2 text-sm">
                <div className="font-medium text-[var(--to-ink)]">Possible duplicate fuse_emp_id match</div>
                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  Advisory only. You can create anyway or go back to search.
                </div>

                <ul className="mt-2 list-disc pl-5 text-xs text-[var(--to-ink)]">
                  {dupMatches.slice(0, 5).map((m) => (
                    <li key={m.person_id}>
                      {m.full_name}{" "}
                      <span className="text-[var(--to-ink-muted)]">
                        · fuse_emp_id: {m.fuse_emp_id || "—"} · email: {m.emails || "—"}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
                    type="button"
                    onClick={() => {
                      setDupMatches(null);
                      setAllowDuplicateFuse(false);
                    }}
                    disabled={busy}
                  >
                    Review / edit
                  </button>

                  <button
                    className={cx(
                      "rounded-md border border-[var(--to-border)] px-3 py-2 text-sm",
                      "bg-[var(--to-ink)] text-white hover:opacity-90"
                    )}
                    type="button"
                    onClick={() => {
                      setAllowDuplicateFuse(true);
                      doCreatePerson();
                    }}
                    disabled={busy}
                  >
                    Create anyway
                  </button>
                </div>
              </div>
            ) : null}

            {/* Form */}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2">
                <div className="text-sm font-medium text-[var(--to-ink)]">Full Name</div>
                <input
                  className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  value={draft.full_name}
                  onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium text-[var(--to-ink)]">Emails</div>
                <input
                  className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  placeholder="comma-separated"
                  value={draft.emails}
                  onChange={(e) => setDraft((d) => ({ ...d, emails: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium text-[var(--to-ink)]">Mobile</div>
                <input
                  className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  value={draft.mobile}
                  onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium text-[var(--to-ink)]">fuse_emp_id</div>
                <input
                  className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  value={draft.fuse_emp_id}
                  onChange={(e) => setDraft((d) => ({ ...d, fuse_emp_id: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium text-[var(--to-ink)]">NT Login</div>
                <input
                  className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  value={draft.person_nt_login}
                  onChange={(e) => setDraft((d) => ({ ...d, person_nt_login: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium text-[var(--to-ink)]">CSG ID</div>
                <input
                  className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  value={draft.person_csg_id}
                  onChange={(e) => setDraft((d) => ({ ...d, person_csg_id: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium text-[var(--to-ink)]">Role</div>
                <input
                  className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <div className="text-sm font-medium text-[var(--to-ink)]">Notes</div>
                <textarea
                  className="min-h-[72px] rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
                  value={draft.person_notes}
                  onChange={(e) => setDraft((d) => ({ ...d, person_notes: e.target.value }))}
                  disabled={busy}
                />
              </label>
            </div>

            {/* Footer actions */}
            <div className="mt-3 flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
              <button
                className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
                type="button"
                onClick={() => setMode("select")}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                className={cx(
                  "rounded-md border border-[var(--to-border)] px-3 py-2 text-sm",
                  "bg-[var(--to-ink)] text-white hover:opacity-90"
                )}
                type="button"
                onClick={doCreatePerson}
                disabled={busy}
              >
                {creating ? "Creating…" : "Create person"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
