// apps/web/src/app/home/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
      <PageHeader
        title="Insight"
        subtitle="Roster Management • Route Lock Planning • Metrics Visibility"
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button type="button" variant="secondary" disabled className="px-4 py-3">
            Roster
          </Button>

          <Button type="button" variant="secondary" disabled className="px-4 py-3">
            Route Lock
          </Button>

          <Button type="button" variant="secondary" disabled className="px-4 py-3">
            Metrics
          </Button>
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
