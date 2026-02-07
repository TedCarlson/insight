"use client";

import Link from "next/link";
import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/state/org";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function DisabledTile({ label, reason }: { label: string; reason: string }) {
  return (
    <div
      className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center", "opacity-60", "cursor-not-allowed")}
      aria-disabled
      title={reason}
    >
      {label} <span className="ml-2 text-xs">🚧</span>
    </div>
  );
}

export default function LocateHomePage() {
  const { orgs, orgsLoading, orgsError, selectedOrgId } = useOrg();

  const hasOrgs = (orgs ?? []).length > 0;
  const isScoped = !!selectedOrgId;

  // Locate MVP: allow the floor to render even if there are no orgs yet,
  // but block module entry until scope exists.
  const noOrgsYet = !orgsLoading && !orgsError && !hasOrgs;
  const blocked = !orgsLoading && hasOrgs && !isScoped;

  return (
    <PageShell>
      <PageHeader title="Locate" subtitle="MVP floor: Roster access + Daily Log (construction barriers up)" />

      {orgsError ? (
        <Card>
          <p className="text-sm text-[var(--to-danger)]">PC load error: {orgsError}</p>
        </Card>
      ) : orgsLoading ? (
        <Card>
          <p className="text-sm text-[var(--to-ink-muted)]">Loading PC scope…</p>
        </Card>
      ) : noOrgsYet ? (
        <Card>
          <p className="text-sm text-[var(--to-ink-muted)]">
            No Locate PCs exist yet. That’s expected right now. Once an admin creates a Locate PC and assigns you, you’ll
            be able to select it in the header.
          </p>
        </Card>
      ) : blocked ? (
        <Card>
          <p className="text-sm text-[var(--to-ink-muted)]">
            Select a <span className="font-medium">PC</span> in the header to unlock Locate tools.
          </p>
        </Card>
      ) : null}

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {isScoped ? (
            <Link href="/roster" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
              Roster
            </Link>
          ) : (
            <DisabledTile label="Roster" reason="Select a PC scope first" />
          )}

          <Link
            href="/locate/daily-log"
            className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}
          >
            Daily Log (Not PC Scoped)
          </Link>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          Locate floor is intentionally small right now. Most areas are behind construction barriers.
        </p>
      </Card>
    </PageShell>
  );
}