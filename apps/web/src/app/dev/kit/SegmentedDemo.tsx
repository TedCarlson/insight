// apps/web/src/app/dev/kit/SegmentedDemo.tsx
"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Card } from "@/components/ui/Card";

type Tab = "roster" | "planning" | "metrics";

export default function SegmentedDemo() {
  const [tab, setTab] = useState<Tab>("roster");

  return (
    <div className="space-y-3">
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "roster", label: "Roster" },
          { value: "planning", label: "Route Lock" },
          { value: "metrics", label: "Metrics" },
        ]}
      />

      <Card variant="subtle">
        <div className="text-sm font-semibold">
          {tab === "roster" ? "Roster" : tab === "planning" ? "Route Lock" : "Metrics"}
        </div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          {tab === "roster"
            ? "Manage staff, roles, and assignments."
            : tab === "planning"
              ? "Plan coverage and lock windows."
              : "Quick visibility into KPIs and performance."}
        </div>
      </Card>
    </div>
  );
}
