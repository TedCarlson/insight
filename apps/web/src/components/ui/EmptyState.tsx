// apps/web/src/components/ui/EmptyState.tsx
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type Action = {
  label: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * EmptyState (pattern)
 * Use when a surface has no data yet.
 * - calm, low-contrast
 * - optional icon
 * - optional 1-2 actions
 */
export function EmptyState({
  title,
  message,
  icon,
  actions,
  compact = false,
}: {
  title: ReactNode;
  message?: ReactNode;
  icon?: ReactNode;
  actions?: Action[];
  compact?: boolean;
}) {
  return (
    <div
      className={cls("rounded border", compact ? "p-4" : "p-6")}
      style={{
        borderColor: "var(--to-empty-border, var(--to-border))",
        background: "var(--to-empty-bg, var(--to-surface))",
      }}
    >
      <div className={cls("flex gap-4", compact ? "items-start" : "items-center")}>
        {icon ? (
          <div
            className={cls("flex items-center justify-center rounded-xl border", compact ? "h-9 w-9" : "h-10 w-10")}
            style={{
              borderColor: "var(--to-border)",
              background: "var(--to-empty-icon-bg, var(--to-surface-2))",
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}

        <div className="min-w-0">
          <div className={cls("font-semibold", compact ? "text-sm" : "text-base")}>{title}</div>
          {message ? <div className="mt-1 text-sm text-[var(--to-ink-muted)]">{message}</div> : null}
        </div>
      </div>

      {actions && actions.length ? (
        <div className={cls("flex flex-wrap gap-2", compact ? "mt-3" : "mt-4")}>
          {actions.slice(0, 2).map((a, i) => {
            const v = a.variant ?? (i == 0 ? "primary" : "secondary");
            if (a.href) {
              return (
                <a key={String(a.label)} href={a.href} className="inline-flex">
                  <Button type="button" variant={v}>
                    {a.label}
                  </Button>
                </a>
              );
            }
            return (
              <Button key={String(a.label)} type="button" variant={v} onClick={a.onClick}>
                {a.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
