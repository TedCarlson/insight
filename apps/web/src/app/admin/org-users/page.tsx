"use client";

import { useMemo } from "react";
import { useOrg } from "@/state/org";
import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";

export default function AdminOrgUsersPage() {
  const { selectedOrgId, orgs, orgsLoading } = useOrg();

  const selectedOrgName = useMemo(() => {
    if (!selectedOrgId) return null;
    const hit = orgs.find((o) => String(o?.pc_org_id) === String(selectedOrgId));
    return hit?.pc_org_name ?? hit?.org_name ?? hit?.name ?? null;
  }, [orgs, selectedOrgId]);

  return (
    <PageShell>
      <PageHeader
        title="Org Users"
        subtitle="Invite status + bulk actions (invite / resend / rescind)"
      />

      <Card variant="subtle">
        {orgsLoading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading orgs…</div>
        ) : !selectedOrgId ? (
          <Notice variant="warning" title="No org selected">
            Select an org to manage users.
          </Notice>
        ) : (
          <div className="text-sm text-[var(--to-ink-muted)]">
            Selected org:{" "}
            <span className="font-medium text-[var(--to-ink)]">
              {selectedOrgName ?? selectedOrgId}
            </span>
          </div>
        )}
      </Card>

      <Card>
        <div className="text-sm text-[var(--to-ink-muted)]">
          Next: we’ll render the user table here with status pills (IP/IS/IA/PS) and bulk actions.
        </div>
      </Card>
    </PageShell>
  );
}
