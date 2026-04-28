// path: apps/web/src/shared/surfaces/people/PeopleIntakeDrawer.tsx

"use client";

import { useState } from "react";

export type PeopleIntakeCreatedPerson = {
  person_id: string;
  full_name: string;
  tech_id: string | null;
  email: string | null;
  mobile: string | null;
  nt_login: string | null;
  csg: string | null;
  affiliation_id: string | null;
};

type AffiliationOption = {
  affiliation_id: string;
  affiliation_label: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (person: PeopleIntakeCreatedPerson) => void;
  affiliations?: AffiliationOption[];
};

function clean(value: string) {
  const next = value.trim();
  return next ? next : null;
}

export function PeopleIntakeDrawer({
  open,
  onClose,
  onCreated,
  affiliations = [],
}: Props) {
  const [draft, setDraft] = useState({
    full_name: "",
    tech_id: "",
    affiliation_id: "",
    mobile: "",
    email: "",
    nt_login: "",
    csg: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/people/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: clean(draft.full_name),
        tech_id: clean(draft.tech_id),
        affiliation_id: clean(draft.affiliation_id),
        mobile: clean(draft.mobile),
        email: clean(draft.email),
        nt_login: clean(draft.nt_login),
        csg: clean(draft.csg),
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.person_id) {
      setSaving(false);
      setError(json?.error ?? "Unable to create person.");
      return;
    }

    setSaving(false);

    onCreated({
      person_id: json.person_id,
      full_name: draft.full_name.trim(),
      tech_id: clean(draft.tech_id),
      affiliation_id: clean(draft.affiliation_id),
      mobile: clean(draft.mobile),
      email: clean(draft.email),
      nt_login: clean(draft.nt_login),
      csg: clean(draft.csg),
    });

    setDraft({
      full_name: "",
      tech_id: "",
      affiliation_id: "",
      mobile: "",
      email: "",
      nt_login: "",
      csg: "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l bg-background p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              People Intake
            </div>
            <h2 className="mt-1 text-lg font-semibold">Create Person</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              Creates an onboarding person record. Workforce assignment can be
              staged after creation.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl border p-4">
          <div className="text-sm font-semibold">Identity</div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              Full Name
              <input
                value={draft.full_name}
                onChange={(e) =>
                  setDraft({ ...draft, full_name: e.target.value })
                }
                className="h-10 rounded-xl border px-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              Tech ID
              <input
                value={draft.tech_id}
                onChange={(e) =>
                  setDraft({ ...draft, tech_id: e.target.value })
                }
                className="h-10 rounded-xl border px-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              Prospecting Affiliation
              <select
                value={draft.affiliation_id}
                onChange={(e) =>
                  setDraft({ ...draft, affiliation_id: e.target.value })
                }
                className="h-10 rounded-xl border px-3"
              >
                <option value="">Select affiliation…</option>
                {affiliations.map((option) => (
                  <option
                    key={option.affiliation_id}
                    value={option.affiliation_id}
                  >
                    {option.affiliation_label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border p-4">
          <div className="text-sm font-semibold">Contact / System IDs</div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              Mobile
              <input
                value={draft.mobile}
                onChange={(e) =>
                  setDraft({ ...draft, mobile: e.target.value })
                }
                className="h-10 rounded-xl border px-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              Email
              <input
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="h-10 rounded-xl border px-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              NT Login
              <input
                value={draft.nt_login}
                onChange={(e) =>
                  setDraft({ ...draft, nt_login: e.target.value })
                }
                className="h-10 rounded-xl border px-3"
              />
            </label>

            <label className="grid gap-1 text-sm">
              CSG ID
              <input
                value={draft.csg}
                onChange={(e) => setDraft({ ...draft, csg: e.target.value })}
                className="h-10 rounded-xl border px-3"
              />
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-[var(--to-danger)] bg-[color-mix(in_oklab,var(--to-danger)_8%,white)] p-3 text-xs">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving || !draft.full_name.trim()}
            className="rounded-xl border border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)] px-3 py-2 text-sm"
          >
            {saving ? "Creating…" : "Create Person"}
          </button>
        </div>
      </aside>
    </div>
  );
}