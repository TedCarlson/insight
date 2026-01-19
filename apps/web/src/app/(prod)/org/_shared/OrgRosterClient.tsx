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

export function OrgRosterClient(props: { rows: MasterRosterRow[]; pcOrgId: string }) {
  const router = useRouter();

  const [showOnlyActive, setShowOnlyActive] = useState(true);

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
    if (!showOnlyActive) return props.rows ?? [];
    return (props.rows ?? []).filter((r) => r?.assignment_active === true);
  }, [props.rows, showOnlyActive]);

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
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--to-ink-muted)]">Showing {filteredRows.length} row(s)</div>

        <div className="flex items-center gap-2">
          <button
            className={showOnlyActive ? toToggleOn : toToggleOff}
            onClick={() => setShowOnlyActive((v) => !v)}
            type="button"
          >
            {showOnlyActive ? "Active" : "All"}
          </button>

          <button className={toBtnPrimary} onClick={openAdd} type="button">
            + Onboard
          </button>
        </div>
      </div>

      {/* Roster table (human-readable) */}
      <div className={toTableWrap}>
        <table className="min-w-full text-sm">
          <thead className={toThead}>
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Tech ID</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Scheduling</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Name</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Mobile</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Reports To</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Company / Contractor</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--to-ink-muted)]" colSpan={6}>
                  No rows to display.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr
                  key={r.assignment_id}
                  className={cx("border-t", "cursor-pointer hover:bg-black/5")}
                  onClick={() => openEdit(r)}
                  role="button"
                  tabIndex={0}
                >
                  <td className="whitespace-nowrap px-3 py-2">{r.tech_id || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {isSchedulingLocked(r) ? (
                      <span className={toPillLocked}>
                        Locked
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--to-ink-muted)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{r.full_name}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.mobile || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.reports_to_full_name || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.co_name || r.co_code || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.assignment_active ? "Yes" : "No"}</td>
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
