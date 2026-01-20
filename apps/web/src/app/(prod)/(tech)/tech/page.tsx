import Link from "next/link";

export default function TechHomePage() {
  return (
    <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
      <div className="text-sm font-semibold">Technician Home</div>
      <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
        This will become the technician’s self-only workspace.
      </div>

      <div className="mt-4">
        <Link
          href="/tech/my-work"
          className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
        >
          Go to My Work
        </Link>
      </div>
    </div>
  );
}
