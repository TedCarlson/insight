// apps/web/src/components/ui/Notice.tsx
import type { ReactNode } from "react";

type Variant = "info" | "success" | "warning" | "danger";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Notice (inline)
 * Low-contrast, in-surface message block.
 */
export function Notice({
  title,
  children,
  variant = "info",
}: {
  title?: ReactNode;
  children: ReactNode;
  variant?: Variant;
}) {
  const tone =
    variant === "success"
      ? "text-[var(--to-success)]"
      : variant === "warning"
        ? "text-[var(--to-warning)]"
        : variant === "danger"
          ? "text-[var(--to-danger)]"
          : "text-[var(--to-info)]";

  return (
    <div
      className="rounded border p-4"
      style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
    >
      {title ? <div className={cls("text-sm font-semibold", tone)}>{title}</div> : null}
      <div className={cls(title ? "mt-1" : "", "text-sm text-[var(--to-ink-muted)]")}>
        {children}
      </div>
    </div>
  );
}
