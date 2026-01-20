// apps/web/src/app/(shell)/dev_home/page.tsx

import Link from "next/link";

type Tile = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

export default function DevHomePage() {
  const tiles: Tile[] = [
    {
      title: "Models",
      description: "Developer utilities for exploring data models and schemas.",
      href: "/models",
      badge: "Dev",
    },
    {
      title: "Tasks",
      description: "Assignment flows, shift validations, and ops checks.",
      href: "/tasks",
      badge: "Ops",
    },
    {
      title: "Data",
      description: "Explore tables, views, and raw records.",
      href: "/data",
      badge: "DB",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dev Home</h1>
        <p className="text-sm text-muted-foreground">
          Quick entry points for developer and admin utilities.
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.title}
            href={t.href}
            className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-semibold">{t.title}</h2>
                  {t.badge ? (
                    <span className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {t.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              </div>

              <span
                aria-hidden
                className="mt-0.5 text-muted-foreground transition group-hover:translate-x-0.5"
              >
                →
              </span>
            </div>

            <div className="mt-4 text-sm font-medium underline-offset-4 group-hover:underline">
              Open
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <div className="text-sm font-medium">Notes</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>These pages are intentionally non-prod and safe to iterate on.</li>
          <li>
            We can later swap these layouts to use <code>Toolbar</code>/<code>DataShell</code> once you like the look.
          </li>
        </ul>
      </section>
    </main>
  );
}
