import * as React from "react";
import { Button } from "@/components/ui/button";

type DataShellProps = {
  /** Main content (table/list/cards) */
  children?: React.ReactNode;

  /** Loading state */
  loading?: boolean;

  /** Optional error message */
  error?: React.ReactNode;

  /** Empty state config */
  isEmpty?: boolean;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;

  /** Optional header area above content (e.g., small summary row) */
  header?: React.ReactNode;

  className?: string;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-4 w-4 rounded bg-muted" />
      <div className="h-4 flex-1 rounded bg-muted" />
      <div className="h-4 w-24 rounded bg-muted" />
    </div>
  );
}

export function DataShell({
  children,
  loading,
  error,
  isEmpty,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your search or filters.",
  emptyAction,
  header,
  className,
}: DataShellProps) {
  return (
    <section className={["rounded-2xl border bg-card", className ?? ""].join(" ")}>
      {header ? <div className="border-b p-4">{header}</div> : null}

      <div className="p-4">
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="text-sm font-medium">Something went wrong</div>
            <div className="mt-1 text-sm text-muted-foreground">{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border bg-background p-6">
            <div className="text-base font-semibold">{emptyTitle}</div>
            <div className="text-sm text-muted-foreground">{emptyDescription}</div>
            {emptyAction ? <div className="pt-1">{emptyAction}</div> : null}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Optional helper if you need a standard Retry button */
export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick}>
      Retry
    </Button>
  );
}
