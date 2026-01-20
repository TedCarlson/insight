//apps/web/src/app/(prod)/org/_shared/OrgRosterClient.tsx

"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MasterRosterRow } from "./OrgRosterPanel";
import { OrgRosterOverlay } from "./OrgRosterOverlay";
import {
  toBtnPrimary,
  toToggleOn,
  toToggleOff,
  toPillLocked,
  toTableWrap,
  toThead,
  toRowHover,
} from "../../_shared/toStyles";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function includesCI(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function OrgRosterClient(props: { rows: MasterRosterRow[]; pcOrgId: string }) {
  const router = useRouter();

  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [q, setQ] = useState("");

  function isSchedulingLocked(r: MasterRosterRow) {
    const isActive = !!r.assignment_active;
    const isTech = (r.position_title ?? "").trim().toLowerCase() === "technician";
    const missingTechId = !r.tech_id || r.tech_id.trim() === "";
    return isActive && isTech && missingTechId;
  }

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayMode, setOverlayMode] = useState<"add" | "edit">("add");
  const [selectedRow, setSelectedRow] = useState<MasterRosterRow | null>(null);

  const filteredRows = useMemo(() => {
    const base = showOnlyActive ? (props.rows ?? []).filter((r) => r?.assignment_active === true) : (props.rows ?? []);

    const needle = q.trim();
    if (!needle) return base;

    return base.filter((r) => {
      const blob = [
        r.full_name ?? "",
        r.tech_id ?? "",
        r.mobile ?? "",
        r.reports_to_full_name ?? "",
        r.co_name ?? "",
        r.co_code ?? "",
        r.position_title ?? "",
      ].join(" | ");
      return includesCI(blob, needle);
    });
  }, [props.rows, showOnlyActive, q]);

  function openAdd() {
    setSelectedRow(null);
    setOverlayMode("add");
    setOverlayOpen(true);
  }

  function openEdit(row: MasterRosterRow) {
    setSelectedRow(row);
    setOverlayMode("edit");
    setOverlayOpen(true);
  }

  function onSaved() {
    // Server component re-fetch
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-col gap-2 rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-[var(--to-ink-muted)]">
            Showing <span className="font-mono text-[var(--to-ink)]">{filteredRows.length}</span> row(s)
          </div>

          <button
            className={showOnlyActive ? toToggleOn : toToggleOff}
            onClick={() => setShowOnlyActive((v) => !v)}
            type="button"
          >
            {showOnlyActive ? "Active" : "All"}
          </button>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            className="w-full rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))] sm:w-[320px]"
            placeholder="Search roster…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <button className={toBtnPrimary} onClick={openAdd} type="button">
            + Onboard
          </button>
        </div>
      </div>

      {/* Roster table */}
      <div className={toTableWrap}>
        <table className="min-w-full border-collapse text-sm">
          <thead className={cx("sticky top-0 border-b border-[var(--to-border)]", toThead)}>
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Tech ID
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Scheduling
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Name
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Mobile
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Reports To
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Company / Contractor
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Active
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--to-ink-muted)]" colSpan={7}>
                  {q.trim()
                    ? "No rows match your search."
                    : showOnlyActive
                    ? "No active rows to display."
                    : "No rows to display."}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr
                  key={r.assignment_id}
                  className={cx("cursor-pointer border-b border-[var(--to-border)]", toRowHover)}
                  onClick={() => openEdit(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEdit(r);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{r.tech_id || "—"}</td>

                  <td className="whitespace-nowrap px-3 py-2">
                    {isSchedulingLocked(r) ? (
                      <span className={toPillLocked}>Locked</span>
                    ) : (
                      <span className="text-xs text-[var(--to-ink-muted)]">—</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--to-ink)]">{r.full_name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{r.mobile || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{r.reports_to_full_name || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{r.co_name || r.co_code || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{r.assignment_active ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <OrgRosterOverlay
        open={overlayOpen}
        mode={overlayMode}
        pcOrgId={props.pcOrgId}
        row={selectedRow}
        onClose={() => setOverlayOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}
