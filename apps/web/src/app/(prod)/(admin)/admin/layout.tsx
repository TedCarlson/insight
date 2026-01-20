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

// UI-only placeholder selector (we'll wire options + persistence next)
function PcOrgSelector() {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-[var(--to-ink-muted)]">PC Org</div>
      <select
        className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-2 py-1 text-sm"
        defaultValue="__placeholder__"
      >
        <option value="__placeholder__">Select…</option>
      </select>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4">
      <header className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Admin</div>
            <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
              Governance + full reach. PC Org context is selectable.
            </div>
          </div>

          <PcOrgSelector />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <NavLink href="/admin" label="Home" />
          <NavLink href="/admin/roster" label="Roster" />
          <NavLink href="/admin/planning" label="Planning" />
          <NavLink href="/admin/permissions" label="Permissions" />
        </div>
      </header>

      <main className="pb-16">{children}</main>
    </section>
  );
}
