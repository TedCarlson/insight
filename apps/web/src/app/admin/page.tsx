// apps/web/src/app/admin/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isManagerPlus(positionTitle: unknown) {
  if (typeof positionTitle !== "string") return false;
  const t = positionTitle.trim().toLowerCase();
  return t === "manager" || t === "director" || t === "vp" || t === "ceo" || t === "cfo" || t === "coo";
}

export default async function AdminPage() {
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

  // Match SessionProvider: isOwner OR Manager+
  let isOwner = false;
  try {
    const { data } = await supabase.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }

  const canSeeAdmin = isOwner || isManagerPlus((user.user_metadata as any)?.position_title);
  if (!canSeeAdmin) redirect("/home");

  return (
    <PageShell>
      <PageHeader title="Admin" subtitle="Administrative tools and configuration" />

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/admin/edge-permissions" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Edge Permissions
          </Link>

          <Link href="/admin/org-users" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Org Users
          </Link>

          <button type="button" className={cls("to-btn", "to-btn--secondary", "px-4 py-3")} disabled>
            Coming soon
          </button>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <button type="button" className={cls("to-btn", "to-btn--secondary", "px-4 py-3")} disabled>
            Coming soon
          </button>

          <button type="button" className={cls("to-btn", "to-btn--secondary", "px-4 py-3")} disabled>
            Coming soon
          </button>

          <button type="button" className={cls("to-btn", "to-btn--secondary", "px-4 py-3")} disabled>
            Coming soon
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          Use this hub to access admin-only tools. Add more modules here as we build them.
        </p>
      </Card>
    </PageShell>
  );
}
