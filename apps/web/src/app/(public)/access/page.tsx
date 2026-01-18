import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { bootstrapProfileServer } from "@/lib/auth/bootstrapProfile.server";

export default async function AccessPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (!user) redirect("/login");

  // Ensure the user_profile exists, even for users who signed up outside the invite flow.
  // This runs server-side using service-role, scoped to the current user's auth_user_id.
  const boot = await bootstrapProfileServer();

  // Read user's own profile status (RLS: user can only read their row)
  // `as any` avoids TypeScript friction if your generated Database types haven't been refreshed yet.
  const { data: profile } = await supabase
    .from("user_profile" as any)
    .select("status, person_id, selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const status = (profile as any)?.status ?? (boot.ok ? boot.status : null) ?? "pending";
  const personId = (profile as any)?.person_id ?? (boot.ok ? boot.person_id : null) ?? null;
  const selectedPcOrgId =
    (profile as any)?.selected_pc_org_id ?? (boot.ok ? boot.selected_pc_org_id : null) ?? null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Access requires approval</h1>

      <p className="mt-3 text-sm text-[var(--to-ink-muted)]">
        Your account is not currently approved to use Insight.
      </p>

      <div
        className="mt-4 rounded border px-4 py-3"
        style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
          Current status
        </div>
        <div className="mt-1 font-mono text-sm text-[var(--to-ink)]">{String(status)}</div>

        <div className="mt-3 grid gap-1 text-xs text-[var(--to-ink-muted)]">
          <div>
            <span className="font-semibold">person_id:</span>{" "}
            <span className="font-mono">{personId ? String(personId) : "—"}</span>
          </div>
          <div>
            <span className="font-semibold">selected_pc_org_id:</span>{" "}
            <span className="font-mono">{selectedPcOrgId ? String(selectedPcOrgId) : "—"}</span>
          </div>
          <div>
            <span className="font-semibold">bootstrap:</span>{" "}
            <span className="font-mono">
              {boot.ok ? `ok (created=${String(boot.created)}, hydrated=${String(boot.hydrated)})` : "not authorized"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          Switch account
        </Link>

        <Link
          href="/"
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          Back to landing
        </Link>
      </div>

      <p className="mt-6 text-sm text-[var(--to-ink-muted)]">
        Contact an administrator to request access. Once approved, refresh the page or reopen the app.
      </p>
    </main>
  );
}
