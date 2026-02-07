import Link from "next/link";

import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function DisabledTile({ label }: { label: string }) {
  return (
    <div
      className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center", "opacity-60", "cursor-not-allowed")}
      aria-disabled
      title="Under construction"
    >
      {label} <span className="ml-2 text-xs">🚧</span>
    </div>
  );
}

export default function LocateHomePage() {
  return (
    <PageShell>
      <PageHeader title="Locate" subtitle="Roster • Daily Log (MVP) • More coming soon" />

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/roster" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Roster
          </Link>

          <Link href="/locate/daily-log" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Daily Log
          </Link>

          <DisabledTile label="Route Planning" />
          <DisabledTile label="Metrics" />
        </div>
      </Card>

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          Locate floor is under construction. If you don’t see any PC organizations for Locate yet, that’s expected.
        </p>
      </Card>
    </PageShell>
  );
}