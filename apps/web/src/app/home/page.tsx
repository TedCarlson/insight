// apps/web/src/app/home/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
        /* noop */
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Insight</h1>
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
        Roster Management • Planning • Metrics Visibility
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/org?tab=roster"
          className="rounded border px-4 py-3 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          Roster
        </Link>

        <Link
          href="/org?tab=planning"
          className="rounded border px-4 py-3 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          Planning
        </Link>

        <Link
          href="/org?tab=metrics"
          className="rounded border px-4 py-3 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          Metrics
        </Link>
      </div>
    </main>
  );
}
