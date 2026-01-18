"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RosterRow = Record<string, any>;

type UnassignedPerson = {
  person_id: string;
  full_name: string;
  emails?: string | null;
};

export function OrgRosterClient(props: { rows: RosterRow[]; pcOrgId: string }) {
  const router = useRouter();
  const { rows, pcOrgId } = props;

  const [showOnlyActive, setShowOnlyActive] = useState(true);

  // Modal state
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<UnassignedPerson[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [positionTitle, setPositionTitle] = useState<string>("Rep");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [saving, setSaving] = useState(false);

  const filteredRows = useMemo(() => {
    if (!showOnlyActive) return rows ?? [];
    return (rows ?? []).filter((r) => r?.active === true);
  }, [rows, showOnlyActive]);

  async function loadPeople(search: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", "25");

      const res = await fetch(`/api/org/unassigned?${params.toString()}`, { method: "GET" });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to load (${res.status})`);
      }
      setPeople(json.people || []);
    } catch (e: any) {
      setPeople([]);
      setError(e?.message || "Failed to load people");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadPeople(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadPeople(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  async function submitAssign() {
    if (!selectedPersonId) {
      setError("Pick a person first.");
      return;
    }
    if (!positionTitle.trim()) {
      setError("Enter a position/title.");
      return;
    }
    if (!startDate.trim()) {
      setError("Pick a start date.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/org/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pc_org_id: pcOrgId,
          person_id: selectedPersonId,
          position_title: positionTitle.trim(),
          start_date: startDate.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Assign failed (${res.status})`);
      }

      // Close + refresh roster
      setOpen(false);
      setQ("");
      setPeople([]);
      setSelectedPersonId("");
      setPositionTitle("Rep");
      setShowOnlyActive(true);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Assign failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--to-ink-muted)]">
          Showing {filteredRows.length} row(s)
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setShowOnlyActive((v) => !v)}
            type="button"
          >
            {showOnlyActive ? "Active" : "All"}
          </button>

          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setOpen(true)}
            type="button"
          >
            + Bring person (global unassigned)
          </button>
        </div>
      </div>

      {/* Simple roster table */}
      <div className="overflow-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              {Object.keys((filteredRows[0] ?? {}) as any).map((k) => (
                <th key={k} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--to-ink-muted)]" colSpan={999}>
                  No rows to display.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  {Object.keys(r).map((k) => (
                    <td key={k} className="whitespace-nowrap px-3 py-2">
                      {String((r as any)[k] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold">Bring person (global unassigned)</div>
                <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                  Search unassigned people, set title + start date, and create an assignment in this org.
                </div>
              </div>

              <button
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => setOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <div className="text-sm font-medium">Search</div>
                <input
                  className="rounded-md border px-3 py-2 text-sm"
                  placeholder="Type a name or email…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>

              <div className="rounded-md border">
                <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
                  <div className="font-medium">Results</div>
                  <div className="text-[var(--to-ink-muted)]">
                    {loading ? "Loading…" : `${people.length} found`}
                  </div>
                </div>

                <div className="max-h-64 overflow-auto">
                  {people.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-[var(--to-ink-muted)]">
                      {loading ? "Loading…" : "No unassigned people found."}
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {people.map((p) => (
                        <li key={p.person_id} className="px-3 py-2">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name="person"
                              checked={selectedPersonId === p.person_id}
                              onChange={() => setSelectedPersonId(p.person_id)}
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
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <div className="text-sm font-medium">Position / Title</div>
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    placeholder="e.g. Rep"
                  />
                </label>

                <label className="grid gap-1">
                  <div className="text-sm font-medium">Start date</div>
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  className="rounded-md border px-3 py-1.5 text-sm"
                  onClick={() => setOpen(false)}
                  type="button"
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="rounded-md border px-3 py-1.5 text-sm font-medium"
                  onClick={submitAssign}
                  type="button"
                  disabled={saving}
                >
                  {saving ? "Assigning…" : "Assign to this org"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
