"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrg } from "@/state/org";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toolbar } from "@/components/ui/Toolbar";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";

type InviteStatus = "not_invited" | "invited_pending" | "active";

type PeopleInventoryRow = {
  person_id: string;
  full_name: string | null;

  emails: string | null;
  email_primary: string | null;
  email_dupe_count: number;

  fuse_emp_id: string | null;
  fuse_dupe_count: number;

  person_active: boolean | null;

  pc_org_rows: number;
  pc_org_active_rows: number;

  assignment_rows: number;
  assignment_active_rows: number;

  leadership_edges: number;

  auth_user_id: string | null;
  profile_status: string | null;

  invite_status: InviteStatus;
  invited_at: string | null;
  last_sign_in_at: string | null;

  // Optional (if you decide to keep "safe delete" later)
  can_delete?: boolean;
};

function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function inviteBadge(status: InviteStatus) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "invited_pending") return <Badge variant="warning">Invited</Badge>;
  return <Badge variant="neutral">Not invited</Badge>;
}

function dupeBadge(count: number, label: string) {
  if (!count || count <= 1) return <Badge variant="neutral">OK</Badge>;
  return (
    <Badge variant="danger">
      {label} ×{count}
    </Badge>
  );
}

export default function AdminOrgUsersPage() {
  /**
   * Keep useOrg so the admin console remains consistent with the rest of the app
   * (org selector still exists), but this page is now GLOBAL and does not scope by org.
   */
  const { orgsLoading } = useOrg();

  const [rows, setRows] = useState<PeopleInventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Paging
  const [limit] = useState(500);
  const [offset, setOffset] = useState(0);

  // Filters
  const [q, setQ] = useState("");
  const [inviteFilter, setInviteFilter] = useState<"all" | InviteStatus>("all");
  const [integrityFilter, setIntegrityFilter] = useState<"all" | "issues_only">("issues_only");
  const [emailDupeFilter, setEmailDupeFilter] = useState<"all" | "dupes_only">("all");
  const [fuseDupeFilter, setFuseDupeFilter] = useState<"all" | "dupes_only">("all");

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setErr(null);

    const ac = new AbortController();
    try {
      const res = await fetch(
        `/api/admin/people-inventory?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(
          String(offset),
        )}`,
        { method: "GET", signal: ac.signal },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const msg = json?.error ?? `Request failed (${res.status})`;
        throw new Error(msg);
      }

      setRows((json.rows ?? []) as PeopleInventoryRow[]);
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e?.message ?? "Failed to load people inventory");
    } finally {
      setLoading(false);
    }

    return () => ac.abort();
  }, [limit, offset]);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return rows.filter((r) => {
      if (inviteFilter !== "all" && r.invite_status !== inviteFilter) return false;

      const emailIsDupe = (r.email_dupe_count ?? 0) > 1;
      const fuseIsDupe = (r.fuse_dupe_count ?? 0) > 1;
      const hasIntegrityIssue = emailIsDupe || fuseIsDupe;

      if (integrityFilter === "issues_only" && !hasIntegrityIssue) return false;
      if (emailDupeFilter === "dupes_only" && !emailIsDupe) return false;
      if (fuseDupeFilter === "dupes_only" && !fuseIsDupe) return false;

      if (!qq) return true;

      const hay = `${r.full_name ?? ""} ${r.email_primary ?? ""} ${r.emails ?? ""} ${r.fuse_emp_id ?? ""} ${
        r.person_id
      }`.toLowerCase();

      return hay.includes(qq);
    });
  }, [rows, q, inviteFilter, integrityFilter, emailDupeFilter, fuseDupeFilter]);

  const summary = useMemo(() => {
    const total = rows.length;

    const emailDupes = rows.filter((r) => (r.email_dupe_count ?? 0) > 1).length;
    const fuseDupes = rows.filter((r) => (r.fuse_dupe_count ?? 0) > 1).length;
    const issues = rows.filter((r) => (r.email_dupe_count ?? 0) > 1 || (r.fuse_dupe_count ?? 0) > 1).length;

    const notInvited = rows.filter((r) => r.invite_status === "not_invited").length;
    const invited = rows.filter((r) => r.invite_status === "invited_pending").length;
    const active = rows.filter((r) => r.invite_status === "active").length;

    return { total, issues, emailDupes, fuseDupes, notInvited, invited, active };
  }, [rows]);

  return (
    <PageShell>
      <PageHeader
        title="People Integrity"
        subtitle="Global inventory anchored on person (duplicates + relationship health + invite status)"
      />

      <Card variant="subtle">
        {orgsLoading ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading…</div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[var(--to-ink-muted)]">
              Scope: <span className="font-medium text-[var(--to-ink)]">All persons</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{summary.total} people</Badge>
              <Badge variant="danger">{summary.issues} issues</Badge>
              <Badge variant="info">{summary.emailDupes} email dupes</Badge>
              <Badge variant="info">{summary.fuseDupes} fuse dupes</Badge>

              <Badge variant="warning">{summary.invited} invited</Badge>
              <Badge variant="success">{summary.active} active</Badge>
              <Badge variant="neutral">{summary.notInvited} not invited</Badge>

              <Button variant="secondary" onClick={() => void fetchInventory()} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        {err ? (
          <Notice variant="danger" title="Could not load people inventory">
            {err}
          </Notice>
        ) : (
          <div className="flex flex-col gap-4">
            <Toolbar
              left={
                <>
                  <Field label="Search">
                    <TextInput
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Name, email, fuse id, or person ID…"
                    />
                  </Field>

                  <Field label="Integrity">
                    <Select value={integrityFilter} onChange={(e) => setIntegrityFilter(e.target.value as any)}>
                      <option value="issues_only">Issues only</option>
                      <option value="all">All</option>
                    </Select>
                  </Field>

                  <Field label="Email dupes">
                    <Select value={emailDupeFilter} onChange={(e) => setEmailDupeFilter(e.target.value as any)}>
                      <option value="all">All</option>
                      <option value="dupes_only">Duplicates only</option>
                    </Select>
                  </Field>

                  <Field label="Fuse dupes">
                    <Select value={fuseDupeFilter} onChange={(e) => setFuseDupeFilter(e.target.value as any)}>
                      <option value="all">All</option>
                      <option value="dupes_only">Duplicates only</option>
                    </Select>
                  </Field>

                  <Field label="Invite">
                    <Select value={inviteFilter} onChange={(e) => setInviteFilter(e.target.value as any)}>
                      <option value="all">All</option>
                      <option value="not_invited">Not invited</option>
                      <option value="invited_pending">Invited (pending)</option>
                      <option value="active">Active</option>
                    </Select>
                  </Field>
                </>
              }
              right={
                <div className="flex items-center gap-2">
                  <div className="text-sm text-[var(--to-ink-muted)]">
                    Showing <span className="font-medium text-[var(--to-ink)]">{filtered.length}</span> of{" "}
                    <span className="font-medium text-[var(--to-ink)]">{rows.length}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setOffset((v) => Math.max(v - limit, 0))}
                      disabled={loading || offset === 0}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setOffset((v) => v + limit)}
                      disabled={loading || rows.length < limit}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              }
            />

            {loading ? (
              <div className="text-sm text-[var(--to-ink-muted)]">Loading…</div>
            ) : filtered.length === 0 ? (
              <EmptyState title="No matches" message="Try clearing filters or changing the search query." />
            ) : (
              <DataTable zebra hover layout="fixed">
                <DataTableHeader>
                  <div className="col-span-4">Person</div>
                  <div className="col-span-2">Integrity</div>
                  <div className="col-span-2">Invite</div>
                  <div className="col-span-1">pc_org</div>
                  <div className="col-span-1">asg</div>
                  <div className="col-span-1">lead</div>
                  <div className="col-span-1 text-right">Active</div>
                </DataTableHeader>

                <DataTableBody zebra>
                  {filtered.map((r) => {
                    const emailIsDupe = (r.email_dupe_count ?? 0) > 1;
                    const fuseIsDupe = (r.fuse_dupe_count ?? 0) > 1;

                    return (
                      <DataTableRow key={r.person_id}>
                        <div className="col-span-4 flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-[var(--to-ink)]">{r.full_name ?? "—"}</div>
                            {emailIsDupe ? <Badge variant="danger">Email dupe</Badge> : null}
                            {fuseIsDupe ? <Badge variant="danger">Fuse dupe</Badge> : null}
                          </div>

                          <div className="text-xs text-[var(--to-ink-muted)]">
                            {r.email_primary ?? "—"}{" "}
                            {r.fuse_emp_id ? (
                              <>
                                <span className="mx-1">•</span> fuse: {r.fuse_emp_id}
                              </>
                            ) : null}
                            <span className="mx-1">•</span> {r.person_id}
                          </div>
                        </div>

                        <div className="col-span-2 flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {dupeBadge(r.email_dupe_count ?? 0, "Email")}
                            {dupeBadge(r.fuse_dupe_count ?? 0, "Fuse")}
                          </div>
                          <div className="text-xs text-[var(--to-ink-muted)]">
                            emails raw: {r.emails ? "yes" : "—"}
                          </div>
                        </div>

                        <div className="col-span-2 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {inviteBadge(r.invite_status)}
                            {r.profile_status ? <Badge variant="info">{r.profile_status}</Badge> : null}
                          </div>
                          <div className="text-xs text-[var(--to-ink-muted)]">
                            invited: {fmtDate(r.invited_at)} <span className="mx-1">•</span> last:{" "}
                            {fmtDate(r.last_sign_in_at)}
                          </div>
                        </div>

                        <div className="col-span-1">
                          <Badge variant={r.pc_org_active_rows > 0 ? "success" : "neutral"}>
                            {r.pc_org_rows}
                          </Badge>
                        </div>

                        <div className="col-span-1">
                          <Badge variant={r.assignment_active_rows > 0 ? "success" : "neutral"}>
                            {r.assignment_rows}
                          </Badge>
                        </div>

                        <div className="col-span-1">
                          <Badge variant={r.leadership_edges > 0 ? "info" : "neutral"}>{r.leadership_edges}</Badge>
                        </div>

                        <div className="col-span-1 flex justify-end">
                          {r.person_active === false ? <Badge variant="warning">No</Badge> : <Badge variant="success">Yes</Badge>}
                        </div>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            )}

            <Notice variant="info" title="Next step">
              Next we can add actions per row: Invite / Resend / Rescind and “Safe delete” (only when the related counts
              are zero). This table is now global and de-dupes are computed across the entire person table.
            </Notice>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
