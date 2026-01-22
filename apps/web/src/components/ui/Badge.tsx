import type { HTMLAttributes, ReactNode } from "react";

type Variant = "neutral" | "success" | "warning" | "danger" | "info";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Badge({
  children,
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode; variant?: Variant }) {
  const base = "rounded-full px-2.5 py-0.5 text-xs border";
  const tone =
    variant === "neutral"
      ? "text-[var(--to-ink-muted)]"
      : variant === "success"
        ? "text-[var(--to-success)]"
        : variant === "warning"
          ? "text-[var(--to-warning)]"
          : variant === "danger"
            ? "text-[var(--to-accent-3)]"
            : "text-[var(--to-info)]";

  return (
    <span
      {...props}
      className={cls(base, tone, className)}
      style={{ borderColor: "var(--to-border)" }}
    >
      {children}
    </span>
  );
}
