import Link from "next/link";
import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { supabaseServer } from "@/lib/supabase/server";

async function getCount(table: string) {
  const sb = await supabaseServer();
  return sb.from(table).select("*", { count: "exact", head: true });
}

export default async function RouteLockQuotaPage() {
  const { count, error } = await getCount("quota");

  return (
    <PageShell>
      <PageHeader title="Quota" subtitle='Route Lock • Backed by table: "quota"' />
      <div className="mb-4">
        <Link href="/route-lock" className="to-btn to-btn--secondary px-4 py-2 inline-flex">
          Back
        </Link>
      </div>

      <Card>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">quota:</span>{" "}
            {error ? <span className="text-[var(--to-ink-muted)]">No access ({error.message})</span> : `${count ?? 0} records`}
          </div>
          <p className="text-sm text-[var(--to-ink-muted)]">
            Next: define quota types (per-day, per-route, per-role) and what “limit” means.
          </p>
        </div>
      </Card>
    </PageShell>
  );
}
