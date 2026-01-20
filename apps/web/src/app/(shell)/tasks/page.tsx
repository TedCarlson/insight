// apps/web/src/app/(shell)/tasks/page.tsx

import Link from "next/link";

export default function TasksPage() {
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Assignment flows, shift validations, and ops checks.
        </p>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-base font-semibold">Coming soon</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This page can become your operational checklist hub (validations, data health, and workflow gates).
          </p>

          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Shift/route validation shortcuts</li>
            <li>“Broken assignment” detector</li>
            <li>Supabase RPC sanity checks</li>
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
              href="/data"
              className="rounded-xl border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              Data
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
