// apps/web/src/components/ui/SegmentedControl.tsx
"use client";

import type { ReactNode } from "react";

type Option<T extends string> = {
  value: T;
  label: ReactNode;
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * SegmentedControl (Tabs-lite)
 * - Use for switching between sibling views inside a page.
 * - Controlled component: value + onChange.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<Option<T>>;
  className?: string;
  size?: "sm" | "md";
}) {
  const wrap = size === "sm" ? "p-0.5" : "p-1";
  const btn = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-sm";

  return (
    <div
      className={cls("inline-flex rounded-full border", wrap, className)}
      style={{
        borderColor: "var(--to-border)",
        background: "var(--to-surface)",
      }}
      role="tablist"
      aria-label="Segmented control"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cls(
              "rounded-full font-medium transition-colors",
              btn,
              active ? "text-[var(--to-ink)]" : "text-[var(--to-ink-muted)] hover:text-[var(--to-ink)]"
            )}
            style={{
              background: active
                ? "var(--to-toggle-active-bg, var(--to-seg-active-bg, var(--to-row-hover)))"
                : "transparent",
              color: active
                ? "var(--to-toggle-active-ink, var(--to-seg-active-ink, var(--to-ink)))"
                : undefined,
              boxShadow: active
                ? "inset 0 0 0 1px var(--to-toggle-active-border, var(--to-seg-active-border, transparent))"
                : undefined,
            }}


          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
