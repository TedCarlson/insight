// apps/web/src/app/(prod)/_shared/toStyles.ts
// Centralized class presets using existing TeamOptix tokens (--to-*).
// Keep it lightweight: just strings you can reuse everywhere.

export const toBtnPrimary =
  "rounded-md border px-3 py-1.5 text-sm font-medium " +
  "bg-[var(--to-btn-primary-bg)] text-[var(--to-btn-primary-text)] " +
  "border-[var(--to-btn-primary-border)] hover:bg-[var(--to-btn-primary-hover)]";

export const toBtnNeutral =
  "rounded-md border px-3 py-1.5 text-sm font-medium " +
  "bg-[var(--to-btn-neutral-bg)] text-[var(--to-btn-neutral-text)] " +
  "border-[var(--to-btn-neutral-border)] hover:bg-[var(--to-btn-neutral-hover)]";

export const toToggleOn =
  "rounded-md border px-3 py-1.5 text-sm font-medium " +
  "bg-[var(--to-toggle-on-bg)] text-[var(--to-toggle-on-text)] " +
  "border-[var(--to-toggle-on-border)]";

export const toToggleOff =
  "rounded-md border px-3 py-1.5 text-sm font-medium " +
  "bg-[var(--to-toggle-off-bg)] text-[var(--to-toggle-off-text)] " +
  "border-[var(--to-toggle-off-border)]";

export const toPillActive =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
  "bg-[var(--to-pill-active-bg)] text-[var(--to-pill-active-text)] border-[var(--to-pill-active-border)]";

export const toPillInactive =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
  "bg-[var(--to-pill-inactive-bg)] text-[var(--to-pill-inactive-text)] border-[var(--to-pill-inactive-border)]";

// We'll use the "inactive" (orange) pill for onboarding locks (non-alarm but attention)
export const toPillLocked = toPillInactive;

export const toTableWrap =
  "overflow-auto rounded-md border bg-[var(--to-surface)] border-[var(--to-border)]";

export const toThead =
  "bg-[var(--to-blue-050)]";

export const toRowHover =
  "hover:bg-[var(--to-row-hover)]";
