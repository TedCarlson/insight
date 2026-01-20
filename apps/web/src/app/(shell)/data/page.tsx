// apps/web/src/app/(shell)/data/page.tsx

import Link from "next/link";

export default function DataPage() {
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Data</h1>
        <p className="text-sm text-muted-foreground">
          Explore tables, views, and raw records here.
        </p>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-base font-semibold">Foundation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This page is a safe place to add “read-only” viewers first (tables, recent changes),
            then gated admin tools later.
          </p>

          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Table browser + row inspector</li>
            <li>Saved queries for common debugging</li>
            <li>Basic “counts & last updated” dashboard</li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-base font-semibold">Navigation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick links to related dev tools.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dev_home"
              className="rounded-xl border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              Dev Home
            </Link>
            <Link
              href="/tasks"
              className="rounded-xl border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              Tasks
            </Link>
            <Link
              href="/models"
              className="rounded-xl border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              Models
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
