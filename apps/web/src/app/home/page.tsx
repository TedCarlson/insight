// apps/web/src/app/home/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default async function HomePage() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* noop (middleware handles refresh/write) */
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) redirect("/login");

  return (
    <PageShell>
      <PageHeader title="Insight" subtitle="Roster Management • Route Lock Planning • Metrics Visibility" />

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/roster" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Roster
          </Link>

          <button type="button" className={cls("to-btn", "to-btn--secondary", "px-4 py-3")} disabled>
            Route Lock
          </button>

          <button type="button" className={cls("to-btn", "to-btn--secondary", "px-4 py-3")} disabled>
            Metrics
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          This is a placeholder landing page. Next we’ll wire each module to real routes and data.
        </p>
      </Card>
    </PageShell>
  );
}
