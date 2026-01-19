"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = Record<string, any>;
type OrgOption = { pc_org_id: string; pc_org_name: string };

export function OrgWireTableClient(props: {
  rows: Row[];
  currentPcOrgId: string;
  orgOptions: OrgOption[];
}) {
  const router = useRouter();
  const { rows, currentPcOrgId, orgOptions } = props;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transfer modal state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFromAssignmentId, setTransferFromAssignmentId] = useState<string>("");
  const [transferToOrgId, setTransferToOrgId] = useState<string>("");
  const [transferTitle, setTransferTitle] = useState<string>("");
  const [transferStartDate, setTransferStartDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [transferNotes, setTransferNotes] = useState<string>("");

  const otherOrgOptions = useMemo(
    () => (orgOptions ?? []).filter((o) => String(o.pc_org_id) !== String(currentPcOrgId)),
    [orgOptions, currentPcOrgId]
  );

  function openTransfer(row: Row) {
    const assignmentId = row.assignment_id ? String(row.assignment_id) : "";
    if (!assignmentId) return;

    const payload = row.payload ?? {};
    const suggestedTitle = String(payload.position_title ?? "").trim();

    setTransferFromAssignmentId(assignmentId);
    setTransferTitle(suggestedTitle || "");
    setTransferToOrgId(otherOrgOptions[0]?.pc_org_id ?? "");
    setTransferStartDate((() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    })());
    setTransferNotes("");
    setError(null);
    setTransferOpen(true);
  }

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

  async function submitTransfer() {
    if (!transferFromAssignmentId || !transferToOrgId || !transferTitle || !transferStartDate) {
      setError("Missing fields for transfer");
      return;
    }

    setBusyId(transferFromAssignmentId);
    setError(null);
    try {
      const res = await fetch("/api/org/wire/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_assignment_id: transferFromAssignmentId,
          to_pc_org_id: transferToOrgId,
          position_title: transferTitle,
          start_date: transferStartDate,
          notes: transferNotes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Transfer failed (${res.status})`);
      }
      setTransferOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to transfer");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
        <table className="min-w-[980px] text-sm">
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
              const eventType = String(r.event_type ?? "");

              // End is only meaningful for active-ish rows; keep it simple:
              // show End only when we have assignment_id and the row isn't already an "ended" event.
              const canEnd = !!assignmentId && eventType !== "assignment_ended";

              // Transfer should apply to the same set as End for now (active assignment context).
              const canTransfer = !!assignmentId && eventType !== "assignment_ended";

              return (
                <tr
                  key={String(r.org_event_id)}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "var(--to-border)" }}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{String(r.created_at ?? "")}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{eventType}</td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
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

                      <button
                        className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
                        style={{ borderColor: "var(--to-border)" }}
                        type="button"
                        disabled={!canTransfer || busyId === assignmentId || otherOrgOptions.length === 0}
                        onClick={() => openTransfer(r)}
                        title={
                          otherOrgOptions.length === 0
                            ? "No other orgs available"
                            : canTransfer
                              ? "Transfer to another org"
                              : "No assignment_id on this event"
                        }
                      >
                        Transfer
                      </button>
                    </div>
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

      {transferOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white p-4 shadow-lg" style={{ borderColor: "var(--to-border)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Transfer person</div>
                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  Ends the current assignment and creates a new one in the destination org.
                </div>
              </div>
              <button
                className="rounded border px-2 py-1 text-sm"
                style={{ borderColor: "var(--to-border)" }}
                onClick={() => setTransferOpen(false)}
                type="button"
                disabled={!!busyId}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="grid gap-1">
                <div className="text-sm font-medium">Destination org</div>
                <select
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={transferToOrgId}
                  onChange={(e) => setTransferToOrgId(e.target.value)}
                  disabled={!!busyId}
                >
                  {otherOrgOptions.map((o) => (
                    <option key={o.pc_org_id} value={o.pc_org_id}>
                      {o.pc_org_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <div className="text-sm font-medium">Position / Title</div>
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--to-border)" }}
                    value={transferTitle}
                    onChange={(e) => setTransferTitle(e.target.value)}
                    placeholder="e.g. BP Supervisor"
                    disabled={!!busyId}
                  />
                </label>

                <label className="grid gap-1">
                  <div className="text-sm font-medium">Start date</div>
                  <input
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--to-border)" }}
                    type="date"
                    value={transferStartDate}
                    onChange={(e) => setTransferStartDate(e.target.value)}
                    disabled={!!busyId}
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <div className="text-sm font-medium">Notes (optional)</div>
                <textarea
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Why was this transfer made?"
                  rows={3}
                  disabled={!!busyId}
                />
              </label>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  className="rounded border px-3 py-1.5 text-sm"
                  style={{ borderColor: "var(--to-border)" }}
                  onClick={() => setTransferOpen(false)}
                  type="button"
                  disabled={!!busyId}
                >
                  Cancel
                </button>

                <button
                  className="rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: "var(--to-border)" }}
                  onClick={submitTransfer}
                  type="button"
                  disabled={!!busyId || !transferToOrgId || !transferTitle || !transferStartDate}
                >
                  {busyId ? "Transferring…" : "Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
