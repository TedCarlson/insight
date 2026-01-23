// apps/web/src/components/ui/DataTable.tsx
import type { HTMLAttributes, ReactNode } from "react";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * DataTable (pattern)
 * - Zebra rows (optional): white rows alternating with a light blue tint
 * - Hover highlight (optional): a stronger blue tint
 * - Header uses the same tint as hover for a cohesive "blue bar" header
 *
 * Tokens:
 * - --to-row-zebra (light blue)
 * - --to-row-hover (darker blue)
 */
export function DataTable({
  children,
  zebra = false,
  hover = true,
}: {
  children: ReactNode;
  zebra?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      data-zebra={zebra ? "true" : "false"}
      data-hover={hover ? "true" : "false"}
      className="overflow-hidden rounded border"
      style={{ borderColor: "var(--to-border)" }}
    >
      {children}
    </div>
  );
}

export function DataTableHeader({
  children,
  gridClassName = "grid-cols-12",
}: {
  children: ReactNode;
  gridClassName?: string;
}) {
  return (
    <div
      className={cls("grid gap-2 border-b px-3 py-2 text-xs font-semibold", gridClassName)}
      style={{
        borderColor: "var(--to-border)",
        background: "var(--to-row-hover)",
      }}
    >
      {children}
    </div>
  );
}

export function DataTableBody({ children, zebra = false }: { children: ReactNode; zebra?: boolean }) {
  return <div className={cls(zebra && "[&>div:nth-child(even)]:bg-[var(--to-row-zebra)]")}>{children}</div>;
}

export function DataTableRow({
  children,
  gridClassName = "grid-cols-12",
  hover = true,
  className,
  ...props
}: {
  children: ReactNode;
  gridClassName?: string;
  hover?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cls(
        "grid gap-2 px-3 py-3 text-sm transition-colors",
        hover && "hover:bg-[var(--to-row-hover)]",
        gridClassName,
        className
      )}
    >
      {children}
    </div>
  );
}

export function DataTableFooter({ children }: { children: ReactNode }) {
  return (
    <div className="border-t px-3 py-2" style={{ borderColor: "var(--to-border)", background: "var(--to-row-hover)" }}>
      {children}
    </div>
  );
}
