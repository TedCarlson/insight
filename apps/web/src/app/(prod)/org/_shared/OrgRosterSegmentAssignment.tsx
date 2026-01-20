//apps/web/src/app/(prod)/org/_shared/OrgRosterSegmentAssignment.tsx

"use client";

import React from "react";
import { toBtnNeutral } from "../../_shared/toStyles";

type PositionTitleRow = {
  position_title: string;
  sort_order?: number | null;
  active?: boolean | null;
};

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

  const busy = saving;
  const readOnly = !canEditAssignment;

  const titlePills = (
    <div className="flex flex-wrap items-center gap-2">
      {titlesLoading ? <Pill>Loading titles…</Pill> : null}
      {readOnly ? <Pill>Read-only</Pill> : null}
      {schedulingLocked ? <Pill tone="warn">Schedule locked</Pill> : null}
      {busy ? <Pill tone="ok">Saving…</Pill> : null}
    </div>
  );

  return (
    <section className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-5">
      {/* Segment header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--to-ink)]">Assignment</div>
          <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
            Core assignment data for this org roster entry.
          </div>
        </div>
        {titlePills}
      </div>

      {/* TODO(grants): field-level edit should be gated by edge task grants */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <div className="text-sm font-medium text-[var(--to-ink)]">PC Org</div>
          <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm text-[var(--to-ink)]">
            {pcOrgName ? `${pcOrgName}` : pcOrgId}
          </div>
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium text-[var(--to-ink)]">Reports To</div>
          <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm text-[var(--to-ink)]">
            {reportsToName || "—"}
          </div>
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium text-[var(--to-ink)]">Position Title</div>
          <select
            className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
            disabled={!canEditAssignment || titlesLoading || titles.length === 0 || busy}
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
          <div className="text-sm font-medium text-[var(--to-ink)]">Tech ID</div>
          <input
            className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
            placeholder="Human-entered tech identifier"
            value={techId}
            onChange={(e) => setTechId(e.target.value)}
            disabled={!canEditAssignment || busy}
          />
          {schedulingLocked ? (
            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
              Scheduling is locked until Tech ID is set for technicians.
            </div>
          ) : null}
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium text-[var(--to-ink)]">Start Date</div>
          <input
            className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
            type="date"
            value={startDate || ""}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!canEditAssignment || busy}
          />
        </label>

        <label className="grid gap-1">
          <div className="text-sm font-medium text-[var(--to-ink)]">End Date</div>
          <input
            className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
            type="date"
            value={endDate || ""}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={!canEditAssignment || isAdd || busy}
          />
          {isAdd ? (
            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
              End date can be set after creation.
            </div>
          ) : null}
        </label>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
        <button
          className={cx(toBtnNeutral, "px-3 py-2 text-sm")}
          type="button"
          onClick={onCancel}
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
          onClick={onSave}
          disabled={busy || !canEditAssignment}
          title={!canEditAssignment ? "You don’t have permission to edit assignment." : undefined}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
