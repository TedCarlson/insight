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
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<Option<T>>;
  className?: string;
}) {
  return (
    <div
      className={cls("inline-flex rounded-full border p-1", className)}
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
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "text-[var(--to-ink)]" : "text-[var(--to-ink-muted)] hover:text-[var(--to-ink)]"
            )}
            style={{
              // Use token so themes can decide the highlight color.
              // Glass theme will set this to a soft green tint.
              background: active ? "var(--to-seg-active-bg, var(--to-row-hover))" : "transparent",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
