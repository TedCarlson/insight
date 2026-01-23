// apps/web/src/app/roster/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type OrgEventRow, type RosterRow } from "@/lib/api";
import { useOrg } from "@/state/org";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrgSelector } from "@/components/OrgSelector";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow } from "@/components/ui/DataTable";
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

function pickTitle(r: RosterRow): string {
  return r.position_title ?? r.title ?? r.role_title ?? "—";
}

function pickStart(r: RosterRow): string {
  const v = r.start_date ?? r.started_at ?? r.effective_start ?? null;
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString();
  } catch {
    return String(v);
  }
}

function pickAssignmentId(r: RosterRow): string {
  return r.assignment_id ?? r.assignment_uuid ?? "—";
}

function pickEventWhen(e: OrgEventRow): string {
  const v = e.created_at ?? e.occurred_at ?? e.at ?? null;
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function pickEventSummary(e: OrgEventRow): string {
  return (
    e.summary ??
    e.message ??
    e.event_label ??
    e.event_key ??
    e.type ??
    (e.payload ? JSON.stringify(e.payload) : "—")
  );
}

export default function RosterPage() {
  const { selectedOrgId, orgs, orgsLoading } = useOrg();

  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [feed, setFeed] = useState<OrgEventRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedRow, setSelectedRow] = useState<RosterRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      setFeed([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const [r, f] = await Promise.all([api.rosterCurrent(validatedOrgId), api.orgEventFeed(validatedOrgId, 50)]);
      setRoster(r);
      setFeed(f);
    } catch (e: any) {
      setRoster([]);
      setFeed([]);
      setErr(e?.message ?? "Failed to load roster/feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatedOrgId]);

  const headerRefreshDisabled = orgsLoading || !canLoad || loading;

  return (
    <PageShell>
      <PageHeader
        title="Roster"
        subtitle="Current roster and recent org activity (scoped by org access gate + RLS)."
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
            <div className="text-xs text-[var(--to-ink-muted)]">
              Org-scoped reads via <code>api.roster_current</code> + <code>api.org_event_feed</code>
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
          <DataTable zebra hover>
            <DataTableHeader gridClassName="grid-cols-12">
              <div className="col-span-5">Person</div>
              <div className="col-span-4">Position</div>
              <div className="col-span-2">Start</div>
              <div className="col-span-1 text-right">ID</div>
            </DataTableHeader>

            <DataTableBody zebra>
              {roster.map((r, idx) => (
                <DataTableRow
                  key={r.assignment_id ?? r.person_id ?? idx}
                  gridClassName="grid-cols-12"
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedRow(r);
                    setDetailsOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedRow(r);
                      setDetailsOpen(true);
                    }
                  }}
                >
                  <div className="col-span-5 truncate">{pickName(r)}</div>
                  <div className="col-span-4 truncate text-[var(--to-ink-muted)]">{pickTitle(r)}</div>
                  <div className="col-span-2 text-[var(--to-ink-muted)]">{pickStart(r)}</div>
                  <div className="col-span-1 text-right font-mono text-xs text-[var(--to-ink-muted)]">
                    {String(pickAssignmentId(r)).slice(0, 6)}
                  </div>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold">Activity</div>

        {orgsLoading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading organizations…</div>
        ) : !canLoad ? (
          <EmptyState
            title={orgs.length ? "Select an organization" : "No organizations available"}
            message={
              orgs.length
                ? "Choose an org to load the event feed."
                : "This user has no org access, so there is no org-scoped activity to display."
            }
            compact
          />
        ) : loading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading activity…</div>
        ) : feed.length === 0 ? (
          <EmptyState title="No recent activity" message="No events returned for this org." compact />
        ) : (
          <div className="space-y-2">
            {feed.slice(0, 50).map((e, idx) => (
              <div
                key={e.org_event_id ?? e.id ?? idx}
                className="rounded border bg-[var(--to-surface)] p-3"
                style={{ borderColor: "var(--to-border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">{pickEventSummary(e)}</div>
                  <div className="shrink-0 text-xs text-[var(--to-ink-muted)]">{pickEventWhen(e)}</div>
                </div>
              </div>
            ))}
          </div>
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
