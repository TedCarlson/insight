import type { ReactNode } from "react";
import Link from "next/link";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-1.5 text-sm hover:bg-[var(--to-surface-soft)]"
    >
      {label}
    </Link>
  );
}

export default function LeadLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4">
      <header className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="text-base font-semibold">Leadership</div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Roster and Planning surfaces (v2 restructure).
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <NavLink href="/lead" label="Home" />
          <NavLink href="/lead/roster" label="Roster" />
          <NavLink href="/lead/planning" label="Planning" />
        </div>
      </header>

      <main className="pb-16">{children}</main>
    </section>
  );
}
