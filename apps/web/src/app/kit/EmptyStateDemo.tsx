// apps/web/src/app/kit/EmptyStateDemo.tsx
"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function EmptyStateDemo() {
  const [hasData, setHasData] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setHasData(false)}>
          Show empty
        </Button>
        <Button type="button" variant="secondary" onClick={() => setHasData(true)}>
          Show data
        </Button>
      </div>

      {hasData ? (
        <Card variant="subtle">
          <div className="text-sm font-semibold">Data loaded</div>
          <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
            When this is false, we show the standardized empty state.
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <EmptyState
            title="No roster yet"
            message="Add your first team member to start assigning routes."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
            }
            actions={[
              { label: "Add member", variant: "primary", onClick: () => {} },
              { label: "Learn more", variant: "secondary", onClick: () => {} },
            ]}
          />

          <EmptyState
            title="No filters applied"
            message="Try adjusting filters or clearing your search."
            compact
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>
            }
            actions={[{ label: "Clear filters", variant: "ghost", onClick: () => {} }]}
          />
        </div>
      )}
    </div>
  );
}
