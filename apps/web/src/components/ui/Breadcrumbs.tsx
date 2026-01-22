// apps/web/src/components/ui/Breadcrumbs.tsx
import type { ReactNode } from "react";
import Link from "next/link";

export type BreadcrumbItem = {
  label: ReactNode;
  href?: string;
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Breadcrumbs (primitive)
 * - Use for hierarchy context. Usually goes under the page header.
 * - Keep short: 2–4 crumbs.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumbs" className={cls("text-xs text-[var(--to-ink-muted)]", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, idx) => {
          const last = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1">
              {it.href && !last ? (
                <Link href={it.href} className="hover:opacity-80">
                  {it.label}
                </Link>
              ) : (
                <span className={cls(last && "text-[var(--to-ink)]")}>{it.label}</span>
              )}
              {!last ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
