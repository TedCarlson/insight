import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
      <div className="text-sm font-semibold">Admin Home</div>
      <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
        This is the new entry point for Admin. We’ll wire Roster/Planning/Permissions here next.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/roster"
          className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
        >
          Go to Roster
        </Link>
        <Link
          href="/admin/planning"
          className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm"
        >
          Go to Planning
        </Link>
        <Link
          href="/admin/permissions"
          className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm"
        >
          Permissions Console
        </Link>
      </div>
    </div>
  );
}
