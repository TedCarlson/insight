"use client";

import { useMemo, useState } from "react";
import type { MasterRosterRow } from "./OrgRosterPanel";
import { createPerson } from "@/app/(prod)/person/person.api";
import type { PersonRow } from "@/app/(prod)/person/person.types";

type UnassignedPerson = {
  person_id: string;
  full_name: string;
  emails?: string | null;
};

type PersonMode = "select" | "create";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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

  if (!isAdd) {
    // edit mode: read-only person summary
    return (
      <section className="rounded-2xl border p-5" style={{ borderColor: "var(--to-border)" }}>
        <div className="text-sm font-semibold">Person</div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Name</div>
            <div className="font-medium">{row?.full_name || "—"}</div>
          </div>
          <div className="rounded-md bg-black/5 px-3 py-2 text-sm">
            <div className="text-xs text-[var(--to-ink-muted)]">Mobile</div>
            <div className="font-medium">{row?.mobile || "—"}</div>
          </div>
          <div className="rounded-md bg-black/5 px-3 py-2 text-sm md:col-span-2">
            <div className="text-xs text-[var(--to-ink-muted)]">Company / Contractor</div>
            <div className="font-medium">{row?.co_name || row?.co_code || "—"}</div>
          </div>
        </div>
      </section>
    );
  }

  const showCreateAffordance =
    canCreatePerson &&
    mode === "select" &&
    !loadingPeople &&
    people.length === 0 &&
    (q.trim().length > 0 || people.length === 0);

  const busy = saving || creating;

  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: "var(--to-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">Person</div>

        {mode === "create" ? (
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
            style={{ borderColor: "var(--to-border)" }}
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
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--to-border)" }}
                placeholder="Search unassigned people…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={busy}
              />
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
                style={{ borderColor: "var(--to-border)" }}
                type="button"
                onClick={() => loadPeople(q)}
                disabled={loadingPeople || busy}
              >
                {loadingPeople ? "Searching…" : "Search"}
              </button>
            </div>

            <div className="rounded-md border" style={{ borderColor: "var(--to-border)" }}>
              {people.length === 0 ? (
                <div className="px-3 py-3 text-sm text-[var(--to-ink-muted)]">
                  {loadingPeople ? "Loading…" : "No results."}
                </div>
              ) : (
                <ul className="max-h-64 overflow-auto divide-y">
                  {people.map((p) => (
                    <li key={p.person_id} className="px-3 py-2">
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
                          <div className="truncate font-medium">{p.full_name}</div>
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

            {showCreateAffordance ? (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-black/5 px-3 py-2">
                <div className="text-sm text-[var(--to-ink-muted)]">
                  No unassigned person found. You can create a new person record.
                </div>
                <button
                  className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
                  style={{ borderColor: "var(--to-border)" }}
                  type="button"
                  onClick={startCreateFromSearch}
                  disabled={busy}
                >
                  + Create new person
                </button>
              </div>
            ) : null}

            {selectedPerson ? (
              <div className="text-sm text-[var(--to-ink-muted)]">Selected: {selectedPerson.full_name}</div>
            ) : null}
          </>
        ) : (
          <div className="rounded-md border p-3" style={{ borderColor: "var(--to-border)" }}>
            <div className="text-sm font-semibold">Create Person</div>
            <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
              Creates a new person record, then you can assign them to this org.
              {/* TODO(grants): gate create fields by edge task grants */}
            </div>

            {dupMatches && dupMatches.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="font-medium">Possible duplicate fuse_emp_id match</div>
                <div className="mt-1 text-xs text-amber-900/80">
                  Advisory only. You can create anyway or go back to search.
                </div>
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {dupMatches.slice(0, 5).map((m) => (
                    <li key={m.person_id}>
                      {m.full_name}{" "}
                      <span className="text-amber-900/70">
                        · fuse_emp_id: {m.fuse_emp_id || "—"} · email: {m.emails || "—"}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-md border px-3 py-2 text-sm hover:bg-white"
                    style={{ borderColor: "var(--to-border)" }}
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
                    className={cx("rounded-md border px-3 py-2 text-sm", "bg-black text-white hover:opacity-90")}
                    style={{ borderColor: "var(--to-border)" }}
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

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="grid gap-1 md:col-span-2">
                <div className="text-sm font-medium">Full Name</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={draft.full_name}
                  onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium">Emails</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  placeholder="comma-separated"
                  value={draft.emails}
                  onChange={(e) => setDraft((d) => ({ ...d, emails: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium">Mobile</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={draft.mobile}
                  onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium">fuse_emp_id</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={draft.fuse_emp_id}
                  onChange={(e) => setDraft((d) => ({ ...d, fuse_emp_id: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium">NT Login</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={draft.person_nt_login}
                  onChange={(e) => setDraft((d) => ({ ...d, person_nt_login: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium">CSG ID</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={draft.person_csg_id}
                  onChange={(e) => setDraft((d) => ({ ...d, person_csg_id: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-medium">Role</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  disabled={busy}
                />
              </label>

              <label className="grid gap-1 md:col-span-2">
                <div className="text-sm font-medium">Notes</div>
                <textarea
                  className="min-h-[72px] rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={draft.person_notes}
                  onChange={(e) => setDraft((d) => ({ ...d, person_notes: e.target.value }))}
                  disabled={busy}
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
                style={{ borderColor: "var(--to-border)" }}
                type="button"
                onClick={() => setMode("select")}
                disabled={busy}
              >
                Cancel
              </button>

              <button
                className={cx("rounded-md border px-3 py-2 text-sm", "bg-black text-white hover:opacity-90")}
                style={{ borderColor: "var(--to-border)" }}
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
