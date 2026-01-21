//apps/web/src/app/(prod)/(lead)/lead/page.tsx

import Link from "next/link";

export default function LeadHomePage() {
  return (
    <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
      <div className="text-sm font-semibold">Leadership Home</div>
      <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
        This is the new entry point for Leadership. Phase 1 Roster/Planning in progress here. Phase 2 Metrics to follow.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/lead/roster"
          className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
        >
          Go to Roster
        </Link>
        <Link
          href="/lead/planning"
          className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm"
        >
          Go to Planning
        </Link>
      </div>
    </div>
  );
}
