// apps/web/src/components/ui/Pagination.tsx
"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Pagination (primitive)
 * - Keep it simple: prev/next + page indicator.
 * - Controlled: page + totalPages + onChange.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
  label,
}: {
  page: number; // 1-based
  totalPages: number;
  onChange: (nextPage: number) => void;
  className?: string;
  label?: ReactNode;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={cls("flex items-center gap-2", className)} aria-label="Pagination">
      {label ? <div className="text-xs text-[var(--to-ink-muted)]">{label}</div> : null}

      <Button
        type="button"
        variant="secondary"
        className="px-2 py-1 text-xs"
        disabled={!canPrev}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </Button>

      <div className="min-w-[88px] text-center text-xs text-[var(--to-ink-muted)]">
        Page <span className="font-semibold text-[var(--to-ink)]">{page}</span> of{" "}
        <span className="font-semibold text-[var(--to-ink)]">{totalPages}</span>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="px-2 py-1 text-xs"
        disabled={!canNext}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
