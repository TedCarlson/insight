// RUN THIS
// Replace the entire file:
// apps/web/src/components/ui/DataTable.tsx

// apps/web/src/components/ui/DataTable.tsx
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type DataTableLayout = "fixed" | "content";

type DataTableDefaults = {
  layout: DataTableLayout;
  gridClassName?: string;
  gridStyle?: CSSProperties;
};

function defaultGridClass(layout: DataTableLayout) {
  // fixed = current behavior (12-col grid)
  // content = each child becomes its own column sized to max-content
  return layout === "content" ? "grid-flow-col auto-cols-max" : "grid-cols-12";
}

// Internal-only prop injected by <DataTable/> into Header + Row (works in Server Components; no hooks).
type InjectedDefaultsProp = {
  __dt?: DataTableDefaults;
};

function injectDefaults(node: ReactNode, defaults: DataTableDefaults): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;

    // Recurse into nested children first (e.g., inside <DataTableBody>).
    const nextProps: any = {};
    if ("children" in (child.props as any)) {
      nextProps.children = injectDefaults((child.props as any).children, defaults);
    }

    // Only inject into our own components. Never add unknown props to DOM nodes.
    if (child.type === DataTableHeader || child.type === DataTableRow) {
      nextProps.__dt = defaults;
    }

    const changed = Object.keys(nextProps).length > 0;
    return changed ? cloneElement(child as any, nextProps) : child;
  });
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
  layout = "fixed",
  gridClassName,
  gridStyle,
}: {
  children: ReactNode;
  zebra?: boolean;
  hover?: boolean;
  /** "fixed" keeps the old 12-col grid; "content" sizes columns to content */
  layout?: DataTableLayout;
  /** Optional default grid classes applied to Header + Row (can still be overridden per component) */
  gridClassName?: string;
  /** Optional default grid styles applied to Header + Row (can still be overridden per component) */
  gridStyle?: CSSProperties;
}) {
  const defaults: DataTableDefaults = { layout, gridClassName, gridStyle };

  return (
    <div
      data-zebra={zebra ? "true" : "false"}
      data-hover={hover ? "true" : "false"}
      className={cls(
        // content-sized columns can overflow horizontally; allow scroll instead of clipping
        layout === "content" ? "overflow-x-auto" : "overflow-hidden",
        "rounded border"
      )}
      style={{ borderColor: "var(--to-border)" }}
    >
      {injectDefaults(children, defaults)}
    </div>
  );
}

export function DataTableHeader({
  children,
  gridClassName,
  gridStyle,
  __dt,
}: {
  children: ReactNode;
  gridClassName?: string;
  /** Optional per-table grid template overrides (e.g., max-content columns). */
  gridStyle?: CSSProperties;
} & InjectedDefaultsProp) {
  const effectiveGridClass =
    gridClassName ?? __dt?.gridClassName ?? defaultGridClass(__dt?.layout ?? "fixed");
  const effectiveGridStyle = { ...(__dt?.gridStyle ?? {}), ...(gridStyle ?? {}) };

  return (
    <div
      className={cls("grid items-center gap-2 border-b px-3 py-2 text-xs font-semibold", effectiveGridClass)}
      style={{
        borderColor: "var(--to-border)",
        background: "var(--to-row-hover)",
        ...effectiveGridStyle,
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
  gridClassName,
  gridStyle,
  hover = true,
  className,
  __dt,
  ...props
}: {
  children: ReactNode;
  gridClassName?: string;
  /** Optional per-table grid template overrides (e.g., max-content columns). */
  gridStyle?: CSSProperties;
  hover?: boolean;
  className?: string;
} & InjectedDefaultsProp &
  HTMLAttributes<HTMLDivElement>) {
  const effectiveGridClass =
    gridClassName ?? __dt?.gridClassName ?? defaultGridClass(__dt?.layout ?? "fixed");
  const effectiveGridStyle = { ...(__dt?.gridStyle ?? {}), ...(gridStyle ?? {}) };

  return (
    <div
      {...props}
      style={{ ...(props.style ?? {}), ...effectiveGridStyle }}
      className={cls(
        "grid items-center gap-2 px-3 py-2 text-sm transition-colors",
        hover && "hover:bg-[var(--to-row-hover)]",
        effectiveGridClass,
        className
      )}
    >
      {children}
    </div>
  );
}

export function DataTableFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-t px-3 py-2"
      style={{ borderColor: "var(--to-border)", background: "var(--to-row-hover)" }}
    >
      {children}
    </div>
  );
}