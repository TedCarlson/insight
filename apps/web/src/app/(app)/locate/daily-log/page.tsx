import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

export default async function LocateDailyLogPage() {
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
      <PageHeader title="Locate — Daily Log" subtitle="MVP surface (Phase 1)" />

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          Placeholder. Next we’ll add: date picker (default today), quick entry form, and a list of entries for the day.
        </p>
      </Card>
    </PageShell>
  );
}