import Link from "next/link";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import PersonJumpSelect from "@/features/metrics/scorecard/components/PersonJumpSelect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TechScorecardMirrorPage() {
  return (
    <PageShell>
      <Card variant="subtle">
        <div className="flex items-center justify-between gap-3 p-3">
          <div>
            <div className="text-sm font-semibold leading-5">Tech Scorecard Mirror</div>
            <div className="text-[11px] text-[var(--to-ink-muted)] leading-4">
              Search any person and open their scorecard (leader mirror).
            </div>
          </div>

          <Link href="/metrics/reports" className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center">
            Back to Reports
          </Link>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          <div className="text-sm font-medium">Find a technician</div>
          <PersonJumpSelect />
        </div>
      </Card>
    </PageShell>
  );
}