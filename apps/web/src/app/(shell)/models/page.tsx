// apps/web/src/app/(shell)/models/page.tsx

import Link from "next/link";

export default function ModelsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
        <p className="text-sm text-muted-foreground">
          Developer utilities for exploring data models and schemas.
        </p>
      </header>

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="text-base font-semibold">Next steps</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is intentionally minimal. We can add:
        </p>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Links into your <code>types/</code> definitions</li>
          <li>Table list from Supabase (if you want read-only introspection)</li>
          <li>“Entity map” page for dev onboarding</li>
        </ul>

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
        </div>
      </section>
    </main>
  );
}
