"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = Record<string, any>;

export function OrgWireTableClient(props: { rows: Row[]; currentPcOrgId: string }) {
  const router = useRouter();
  const { rows } = props;

  const [ending, setEnding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(
    () => [
      { key: "created_at", label: "When" },
      { key: "event_type", label: "Event" },
      { key: "person_full_name", label: "Person" },
      { key: "actor_label", label: "Actor" },
    ],
    []
  );

  async function endAssignment(row: Row) {
    const assignment_id = row?.assignment_id ? String(row.assignment_id) : "";
    if (!assignment_id) return;

    if (!confirm("End this assignment?")) return;

    setError(null);
    setEnding(assignment_id);
    try {
      const res = await fetch("/api/org/wire/end-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "End assignment failed");

      router.refresh();
    } catch (e: any) {
      setError(e?.message || "End assignment failed");
    } finally {
      setEnding(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {c.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const assignmentId = r?.assignment_id ? String(r.assignment_id) : "";
              const canEnd = !!assignmentId && String(r?.event_type || "") !== "assignment_ended";

              return (
                <tr key={String(r.org_event_id || r.created_at)} className="border-t">
                  {columns.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-3 py-2">
                      {String(r?.[c.key] ?? "")}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      type="button"
                      onClick={() => endAssignment(r)}
                      disabled={!canEnd || ending === assignmentId}
                      title={!canEnd ? "No active assignment to end." : undefined}
                    >
                      {ending === assignmentId ? "Ending…" : "End"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
