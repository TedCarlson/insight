"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Row = Record<string, any>;

export function OrgWireTableClient(props: { rows: Row[] }) {
  const router = useRouter();
  const { rows } = props;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function endAssignment(assignmentId: string) {
    const ok = window.confirm("End this assignment? This will set end_date=today and log an event.");
    if (!ok) return;

    setBusyId(assignmentId);
    setError(null);
    try {
      const res = await fetch("/api/org/wire/end-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to end assignment");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
        <table className="min-w-[900px] text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--to-border)" }}>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Actions</th>
              <th className="px-3 py-2 text-left">Person</th>
              <th className="px-3 py-2 text-left">Actor</th>
              <th className="px-3 py-2 text-left">Details</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const payload = r.payload ?? {};
              const position = payload.position_title ?? "";
              const start = payload.start_date ?? "";
              const reason = payload.reason_code ?? "";
              const notes = payload.notes ?? "";

              const details = [
                position ? `title: ${position}` : null,
                start ? `start: ${start}` : null,
                reason ? `reason: ${reason}` : null,
                notes ? `notes: ${notes}` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              const assignmentId = r.assignment_id ? String(r.assignment_id) : "";
              const canEnd = !!assignmentId && String(r.event_type ?? "") !== "assignment_ended";

              return (
                <tr
                  key={String(r.org_event_id)}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "var(--to-border)" }}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{String(r.created_at ?? "")}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{String(r.event_type ?? "")}</td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
                      style={{ borderColor: "var(--to-border)" }}
                      type="button"
                      disabled={!canEnd || busyId === assignmentId}
                      onClick={() => assignmentId && endAssignment(assignmentId)}
                      title={canEnd ? "End assignment" : "No assignment_id on this event"}
                    >
                      {busyId === assignmentId ? "Ending…" : "End"}
                    </button>
                  </td>

                  <td className="px-3 py-2">{String(r.person_full_name ?? r.person_id ?? "")}</td>
                  <td className="px-3 py-2">{String(r.actor_label ?? r.actor_user_id ?? "")}</td>
                  <td className="px-3 py-2 max-w-[420px] truncate" title={details}>
                    {details || ""}
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
