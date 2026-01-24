// apps/web/src/app/roster/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type RosterRow } from "@/lib/api";
import { useOrg } from "@/state/org";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrgSelector } from "@/components/OrgSelector";

import { RosterTable } from "@/components/roster/RosterTable";
import { RosterRowModule } from "@/components/roster/RosterRowModule";

function pickName(r: RosterRow): string {
  return (
    r.full_name ??
    r.person_name ??
    r.name ??
    [r.first_name, r.last_name].filter(Boolean).join(" ") ??
    r.email ??
    r.person_id ??
    "—"
  );
}

export default function RosterPage() {
  const { selectedOrgId, orgs, orgsLoading } = useOrg();

  const [roster, setRoster] = useState<RosterRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedRow, setSelectedRow] = useState<RosterRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [orgMeta, setOrgMeta] = useState<{ mso_name: string | null; division_name: string | null; region_name: string | null } | null>(
    null
  );
  const [orgMetaLoading, setOrgMetaLoading] = useState(false);

  const validatedOrgId = useMemo(() => {
    if (orgsLoading) return null;
    if (!selectedOrgId) return null;
    return orgs.some((o: any) => String(o.pc_org_id) === String(selectedOrgId)) ? selectedOrgId : null;
  }, [selectedOrgId, orgs, orgsLoading]);

  const selectedOrgName = useMemo(() => {
    if (!validatedOrgId) return null;
    const hit = orgs.find((o: any) => String(o.pc_org_id) === String(validatedOrgId));
    return (hit?.pc_org_name ?? hit?.org_name ?? hit?.name ?? null) as string | null;
  }, [orgs, validatedOrgId]);

  const canLoad = Boolean(validatedOrgId);

  async function loadAll() {
    if (!validatedOrgId) {
      setErr(null);
      setRoster([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const r = await api.rosterCurrentFull(validatedOrgId, null);
      setRoster(r);
    } catch (e: any) {
      setRoster([]);
      setErr(e?.message ?? "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatedOrgId]);


  useEffect(() => {
    let alive = true;

    async function loadOrgMeta() {
      if (!validatedOrgId) {
        setOrgMeta(null);
        return;
      }

      setOrgMetaLoading(true);
      try {
        const meta = await api.pcOrgAdminMeta(validatedOrgId);
        if (alive)
          setOrgMeta({
            mso_name: meta?.mso_name ?? null,
            division_name: meta?.division_name ?? null,
            region_name: meta?.region_name ?? null,
          });

      } catch {
        if (alive) setOrgMeta({ mso_name: null, division_name: null, region_name: null });
      } finally {
        if (alive) setOrgMetaLoading(false);
      }
    }

    loadOrgMeta();
    return () => {
      alive = false;
    };
  }, [validatedOrgId]);


  const headerRefreshDisabled = orgsLoading || !canLoad || loading;

  return (
    <PageShell>
      <PageHeader
        title="Roster"
        subtitle="Current roster (scoped by PC access gate)."
        actions={
          <Button variant="secondary" type="button" onClick={loadAll} disabled={headerRefreshDisabled}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {canLoad && err ? (
        <Notice variant="danger" title="Could not load roster">
          <div className="text-sm">{err}</div>
          <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
            If this is a permission issue, you should see a hard <code>Forbidden</code> / <code>Unauthorized</code>{" "}
            error (expected behavior).
          </div>
        </Notice>
      ) : null}

      <Card variant="subtle">
        <Toolbar
          left={<OrgSelector />}
          right={
            <div className="text-xs text-[var(--to-ink-muted)] text-right">
              {validatedOrgId ? (
                <div >
                  <span>
                    MSO: <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.mso_name ?? "—"}</span>
                  </span>
                  <span className="px-2"> • </span>
                  <span>
                    Division: <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.division_name ?? "—"}</span>
                  </span>
                  <span className="px-2"> • </span>
                  <span>
                    Region: <span className="text-[var(--to-ink)]">{orgMetaLoading ? "…" : orgMeta?.region_name ?? "—"}</span>
                  </span>
                </div>
              ) : null}
</div>
          }
        />
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold">Current roster</div>

        {orgsLoading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading organizations…</div>
        ) : !canLoad ? (
          <EmptyState
            title={orgs.length ? "Select an organization" : "No organizations available"}
            message={
              orgs.length
                ? "Choose an org to load the roster."
                : "This user has no org access. Ask an owner/admin to grant access or add membership."
            }
            compact
          />
        ) : loading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading roster…</div>
        ) : roster.length === 0 ? (
          <EmptyState title="No active roster entries" message="This org has no current assignments (or you don’t have access)." compact />
        ) : (
          <RosterTable
            roster={roster}
            pickName={pickName}
            onRowOpen={(row) => {
              setSelectedRow(row);
              setDetailsOpen(true);
            }}
          />
        )}
      </Card>

      {validatedOrgId ? (
        <RosterRowModule
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          pcOrgId={validatedOrgId}
          pcOrgName={selectedOrgName}
          row={selectedRow}
        />
      ) : null}
    </PageShell>
  );
}
