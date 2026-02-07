import Link from "next/link";

import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function FulfillmentHomePage() {
  return (
    <PageShell>
      <PageHeader title="Fulfillment" subtitle="Roster Management • Route Lock Planning • Metrics Visibility" />

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/roster" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Roster
          </Link>
          <Link href="/route-lock" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Route Lock
          </Link>
          <Link href="/metrics" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Metrics
          </Link>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          Select a PC organization in the header to scope data, then choose a module.
        </p>
      </Card>
    </PageShell>
  );
}