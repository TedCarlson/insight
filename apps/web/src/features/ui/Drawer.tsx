import type { ReactNode } from "react";

export function Drawer(props: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={props.onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-[var(--to-border)] bg-[var(--to-surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--to-border)] p-4">
          <div>
            <div className="text-sm font-semibold">{props.title}</div>
            {props.description ? (
              <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                {props.description}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-1.5 text-sm hover:bg-[var(--to-surface-soft)]"
          >
            Close
          </button>
        </div>

        <div className="h-[calc(100%-64px)] overflow-y-auto p-4">
          {props.children}
        </div>
      </div>
    </div>
  );
}
