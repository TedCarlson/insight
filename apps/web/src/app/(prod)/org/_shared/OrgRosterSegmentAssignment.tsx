"use client";

import React from "react";

type PositionTitleRow = {
  position_title: string;
  sort_order?: number | null;
  active?: boolean | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function OrgRosterSegmentAssignment(props: {
  pcOrgId: string;
  pcOrgName?: string | null;
  reportsToName?: string | null;

  titles: PositionTitleRow[];
  titlesLoading: boolean;

  positionTitle: string;
  setPositionTitle: (v: string) => void;

  techId: string;
  setTechId: (v: string) => void;

  startDate: string;
  setStartDate: (v: string) => void;

  endDate: string;
  setEndDate: (v: string) => void;

  isAdd: boolean;
  saving: boolean;

  canEditAssignment: boolean;
  schedulingLocked: boolean;

  onCancel: () => void;
  onSave: () => void;
}) {
  const {
    pcOrgId,
    pcOrgName,
    reportsToName,

    titles,
    titlesLoading,

    positionTitle,
    setPositionTitle,

    techId,
    setTechId,

    startDate,
    setStartDate,

    endDate,
    setEndDate,

    isAdd,
    saving,

    canEditAssignment,
    schedulingLocked,

    onCancel,
    onSave,
  } = props;

  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: "var(--to-border)" }}>
      <div className="text-sm font-semibold">Assignment</div>

      {/* TODO(grants): field-level edit should be gated by edge task grants */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <div className="text-sm font-medium">PC Org</div>
          <div className="rounded-md border bg-black/5 px-3 py-2 text-sm" style={{ borderColor: "var(--to-border)" }}>
            {pcOrgName ? `${pcOrgName}` : pcOrgId}
          </div>
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium">Reports To</div>
          <div className="rounded-md border bg-black/5 px-3 py-2 text-sm" style={{ borderColor: "var(--to-border)" }}>
            {reportsToName || "—"}
          </div>
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium">Position Title</div>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)" }}
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
            disabled={!canEditAssignment || titlesLoading || titles.length === 0 || saving}
          >
            {titlesLoading ? (
              <option value={positionTitle}>Loading…</option>
            ) : titles.length === 0 ? (
              <option value={positionTitle}>No titles available</option>
            ) : (
              titles.map((t) => (
                <option key={t.position_title} value={t.position_title}>
                  {t.position_title}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium">Tech ID</div>
          <input
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)" }}
            placeholder="Human-entered tech identifier"
            value={techId}
            onChange={(e) => setTechId(e.target.value)}
            disabled={!canEditAssignment || saving}
          />
          {schedulingLocked ? (
            <div className="text-xs text-amber-800">
              Scheduling locked until Tech ID is set for technicians.
            </div>
          ) : null}
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium">Start Date</div>
          <input
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)" }}
            type="date"
            value={startDate || ""}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!canEditAssignment || saving}
          />
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium">End Date</div>
          <input
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)" }}
            type="date"
            value={endDate || ""}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={!canEditAssignment || isAdd || saving}
          />
          {isAdd ? (
            <div className="text-xs text-[var(--to-ink-muted)]">End date can be set after creation.</div>
          ) : null}
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          className={cx("rounded-md border px-3 py-2 text-sm", "bg-black text-white hover:opacity-90")}
          style={{ borderColor: "var(--to-border)" }}
          type="button"
          onClick={onSave}
          disabled={saving || !canEditAssignment}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
