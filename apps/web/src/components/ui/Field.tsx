import type { ReactNode } from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-[var(--to-ink-muted)]">{label}</div>
      {children}
    </div>
  );
}
