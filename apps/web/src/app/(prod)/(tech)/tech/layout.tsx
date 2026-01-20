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

export default function TechLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4">
      <header className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="text-base font-semibold">Technician</div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Self-only execution surface (v2 restructure).
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <NavLink href="/tech" label="Home" />
          <NavLink href="/tech/my-work" label="My Work" />
        </div>
      </header>

      <main className="pb-16">{children}</main>
    </section>
  );
}
