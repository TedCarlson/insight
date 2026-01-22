// apps/web/src/components/ui/Toolbar.tsx
import type { ReactNode } from "react";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Toolbar (pattern)
 * Standard top-of-page control bar:
 * - left: search/filters
 * - right: actions
 *
 * Keep pages drift-free by using this instead of ad-hoc flex rows.
 */
export function Toolbar({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cls(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">{left}</div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
