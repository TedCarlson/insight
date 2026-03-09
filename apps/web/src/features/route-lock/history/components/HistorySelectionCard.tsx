"use client";

type Props = {
  selectedTechLabel: string | null;
  fromDate: string;
  toDate: string;
};

export default function HistorySelectionCard(props: Props) {
  if (!props.selectedTechLabel) return null;

  return (
    <div className="rounded-2xl border bg-[var(--to-surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm">
          <span className="font-semibold text-[var(--to-ink)]">Selected Tech:</span>{" "}
          <span className="text-[var(--to-ink)]">{props.selectedTechLabel}</span>
        </div>

        <div className="rounded-lg border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 py-2 text-sm text-[var(--to-ink-muted)]">
          Window: {props.fromDate} → {props.toDate}
        </div>
      </div>
    </div>
  );
}