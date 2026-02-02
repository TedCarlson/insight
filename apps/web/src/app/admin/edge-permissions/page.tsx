// apps/web/src/app/admin/edge-permissions/page.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrg } from "@/state/org";
import {
  api,
  type PcOrgPermissionGrantRow,
  type PermissionDefRow,
  type PcOrgChoice,
  type PcOrgEligibilityRow,
} from "@/lib/api";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";

type UserHit = {
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function displayUser(u: UserHit) {
  const label = u.full_name ?? u.email ?? u.auth_user_id;
  const email = u.email ? ` (${u.email})` : "";
  return `${label}${email}`;
}

// Hide the owner/super-user from dropdown lists (owner can still use the console)
const OWNER_AUTH_USER_ID = process.env.NEXT_PUBLIC_OWNER_AUTH_USER_ID ?? "";

/**
 * “Route Lock manager” bundle:
 * - people_manage: onboarding/person edits
 * - roster_manage: roster + all Route Lock write surfaces (routes/quota/schedule/shift validation)
 * - leadership_manage: reporting chain changes (if applicable in your org flows)
 */
const MANAGER_BUNDLE = ["people_manage", "roster_manage", "leadership_manage"] as const;
type ManagerKey = (typeof MANAGER_BUNDLE)[number];



export default function EdgePermissionsConsolePage() {
  const { selectedOrgId, orgs, orgsLoading } = useOrg();
  const [viewerAuthUserId, setViewerAuthUserId] = useState<string>("");
  const [viewerIsOwner, setViewerIsOwner] = useState<boolean>(false);
  const [viewerLoading, setViewerLoading] = useState<boolean>(true);

  const selectedOrgName = useMemo(() => {
    if (!selectedOrgId) return null;
    const hit = orgs.find((o: any) => String(o.pc_org_id) === String(selectedOrgId));
    return (hit?.pc_org_name ?? hit?.org_name ?? hit?.name ?? null) as string | null;
  }, [orgs, selectedOrgId]);

  const [defs, setDefs] = useState<PermissionDefRow[]>([]);
  const [grants, setGrants] = useState<PcOrgPermissionGrantRow[]>([]);
  const [users, setUsers] = useState<UserHit[]>([]);

  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Selection
  const [authUserId, setAuthUserId] = useState("");
  const selectedUser = useMemo(() => users.find((u) => u.auth_user_id === authUserId) ?? null, [users, authUserId]);
  const [isItgSupervisor, setIsItgSupervisor] = useState(false);
  const membershipLocked = isItgSupervisor;

  // Optional client-side filter (only shown if list is long)
  const [userFilter, setUserFilter] = useState("");
  const showUserFilter = users.length > 20;
  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const a = (u.full_name ?? "").toLowerCase();
      const b = (u.email ?? "").toLowerCase();
      const c = (u.auth_user_id ?? "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q);
    });
  }, [users, userFilter]);

  // "Advanced" fields (hidden by default — keeps workflow simple)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Org membership (eligibility) for the selected user
  const [eligibleOrgIds, setEligibleOrgIds] = useState<Set<string>>(new Set());
  const [eligLoading, setEligLoading] = useState(false);
  const [orgFilter, setOrgFilter] = useState("");

  // Bundle mutation state (separate from "loading" so refresh buttons still behave predictably)
  const [bundleBusy, setBundleBusy] = useState(false);

  const visibleOrgs: PcOrgChoice[] = useMemo(() => {
    // Reuse the org list already present in the session/org wrapper.
    // For dev this is effectively “all orgs”; for others it is “orgs you can see/manage.”
    const list = (orgs ?? []) as any[];
    return list as PcOrgChoice[];
  }, [orgs]);

  const filteredOrgs = useMemo(() => {
    const q = orgFilter.trim().toLowerCase();
    if (!q) return visibleOrgs;
    return visibleOrgs.filter((o) => {
      const id = String(o.pc_org_id ?? "").toLowerCase();
      const name = String(o.pc_org_name ?? o.org_name ?? o.name ?? "").toLowerCase();
      return id.includes(q) || name.includes(q);
    });
  }, [visibleOrgs, orgFilter]);

  const loadIsItgSupervisor = useCallback(async (userId: string) => {
    try {
      const out = await api.isItgSupervisor(userId);
      setIsItgSupervisor(!!out);
    } catch {
      // If the RPC is not available or forbidden for some reason, default to false.
      setIsItgSupervisor(false);
    }
  }, []);

  const loadEligibilityForUser = useCallback(async (userId: string) => {
    setEligLoading(true);
    setErr(null);
    try {
      const rows = await api.pcOrgEligibilityForUser(userId);
      const s = new Set<string>(
        (rows ?? []).map((r: PcOrgEligibilityRow) => String(r.pc_org_id ?? "")).filter(Boolean)
      );
      setEligibleOrgIds(s);
    } catch (e: any) {
      setEligibleOrgIds(new Set());
      setErr(e?.message ?? "Failed to load org membership");
    } finally {
      setEligLoading(false);
    }
  }, []);

  async function toggleOrgEligibility(pc_org_id: string) {
    if (!authUserId) return;
    setErr(null);
    try {
      const has = eligibleOrgIds.has(pc_org_id);
      if (has) {
        await api.pcOrgEligibilityRevoke({ pc_org_id, auth_user_id: authUserId });
      } else {
        await api.pcOrgEligibilityGrant({ pc_org_id, auth_user_id: authUserId });
      }
      await loadEligibilityForUser(authUserId);
    } catch (e: any) {
      setErr(e?.message ?? "Membership update failed");
    }
  }

  const canLoad = Boolean(selectedOrgId) && !orgsLoading;

  const grantsForSelectedUser = useMemo(() => {
    if (!authUserId) return [];
    return grants.filter((g) => String(g.auth_user_id ?? "") === authUserId);
  }, [grants, authUserId]);

  const grantedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const g of grantsForSelectedUser) {
      if (g.permission_key) s.add(String(g.permission_key));
    }
    return s;
  }, [grantsForSelectedUser]);

  const loadUsers = useCallback(async () => {
    if (!selectedOrgId) return;
    setUsersLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/org-users?pc_org_id=${encodeURIComponent(selectedOrgId)}`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `Failed to load users (${r.status})`);
      const list = (j?.users ?? []) as UserHit[];
      const filtered = OWNER_AUTH_USER_ID ? list.filter((u) => u.auth_user_id !== OWNER_AUTH_USER_ID) : list;
      setUsers(filtered);
    } catch (e: any) {
      setUsers([]);
      setErr(e?.message ?? "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [selectedOrgId]);

  const loadPermsAndGrants = useCallback(async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    setErr(null);
    try {
      const [d, g] = await Promise.all([api.permissionDefs(), api.permissionsForOrg(selectedOrgId)]);
      setDefs(d);
      setGrants(g);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load permissions");
      setDefs([]);
      setGrants([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadUsers(), loadPermsAndGrants()]);
  }, [loadUsers, loadPermsAndGrants]);

  useEffect(() => {
    if (!selectedOrgId || orgsLoading) return;
    // Load once per org selection
    refreshAll();
  }, [selectedOrgId, orgsLoading, refreshAll]);

  useEffect(() => {
    if (!authUserId) {
      setIsItgSupervisor(false);
      return;
    }
    loadIsItgSupervisor(authUserId);
    loadEligibilityForUser(authUserId);
  }, [authUserId, loadIsItgSupervisor, loadEligibilityForUser]);

  useEffect(() => {
    let alive = true;

    async function loadViewer() {
      setViewerLoading(true);
      try {
        const r = await fetch("/api/admin/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) throw new Error(j?.error ?? `Failed to load viewer (${r.status})`);

        if (!alive) return;
        setViewerAuthUserId(String(j.auth_user_id ?? ""));
        setViewerIsOwner(!!j.is_owner);
      } catch {
        if (!alive) return;
        setViewerAuthUserId("");
        setViewerIsOwner(false);
      } finally {
        if (!alive) return;
        setViewerLoading(false);
      }
    }

    loadViewer();
    return () => {
      alive = false;
    };
  }, []);

  // Simple, “your-way” workflow: click to grant/revoke
  async function togglePermission(permission_key: string) {
    if (!selectedOrgId) return;
    if (!authUserId) return;
    setErr(null);

    const isGranted = grantedKeys.has(permission_key);

    try {
      if (isGranted) {
        await api.permissionRevoke({
          pc_org_id: selectedOrgId,
          auth_user_id: authUserId,
          permission_key,
        });
      } else {
        await api.permissionGrant({
          pc_org_id: selectedOrgId,
          auth_user_id: authUserId,
          permission_key,
          expires_at: advancedOpen && expiresAt.trim() ? expiresAt.trim() : null,
          notes: advancedOpen && notes.trim() ? notes.trim() : null,
        });
        // Clear advanced fields after a successful grant so they don't "stick" unexpectedly
        setExpiresAt("");
        setNotes("");
      }

      await loadPermsAndGrants();
    } catch (e: any) {
      setErr(e?.message ?? "Update failed");
    }
  }

  // Bundle helpers (fast manager setup)
  const availablePermissionKeys = useMemo(() => new Set(defs.map((d) => String(d.permission_key))), [defs]);

  const managerBundleKeys: ManagerKey[] = useMemo(() => {
    // only keys that exist in defs to avoid confusing “missing permission def” errors
    return MANAGER_BUNDLE.filter((k) => availablePermissionKeys.has(k)) as ManagerKey[];
  }, [availablePermissionKeys]);

  const managerBundleGrantedCount = useMemo(() => {
    let n = 0;
    for (const k of managerBundleKeys) if (grantedKeys.has(k)) n += 1;
    return n;
  }, [managerBundleKeys, grantedKeys]);

  async function grantManagerBundle() {
    if (!selectedOrgId || !authUserId) return;
    setErr(null);
    setBundleBusy(true);
    try {
      for (const permission_key of managerBundleKeys) {
        if (grantedKeys.has(permission_key)) continue;
        await api.permissionGrant({
          pc_org_id: selectedOrgId,
          auth_user_id: authUserId,
          permission_key,
          expires_at: null,
          notes: null,
        });
      }
      await loadPermsAndGrants();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to grant Manager Bundle");
    } finally {
      setBundleBusy(false);
    }
  }

  async function revokeManagerBundle() {
    if (!selectedOrgId || !authUserId) return;
    setErr(null);
    setBundleBusy(true);
    try {
      for (const permission_key of managerBundleKeys) {
        if (!grantedKeys.has(permission_key)) continue;
        await api.permissionRevoke({
          pc_org_id: selectedOrgId,
          auth_user_id: authUserId,
          permission_key,
        });
      }
      await loadPermsAndGrants();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to revoke Manager Bundle");
    } finally {
      setBundleBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Edge Permissions Console"
        subtitle="Select a user, then toggle permissions on/off (org-scoped)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={loadUsers} disabled={!canLoad || usersLoading}>
              {usersLoading ? "Loading users…" : "Refresh users"}
            </Button>
            <Button variant="secondary" type="button" onClick={loadPermsAndGrants} disabled={!canLoad || loading}>
              {loading ? "Refreshing…" : "Refresh grants"}
            </Button>
          </div>
        }
      />

      {!canLoad ? (
        <EmptyState title="Select a PC org" message="Use the PC selector in the top nav to choose an org first." />
      ) : (
        <>
          <Card className="p-4">
            <div className="text-sm text-[var(--to-ink-muted)]">
              Org: <span className="text-[var(--to-ink)]">{selectedOrgName ?? selectedOrgId}</span>
            </div>

            {err ? (
              <div className="mt-3">
                <Notice variant="danger" title="Error">
                  <div className="text-sm">{err}</div>
                </Notice>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="User (org eligible)">
                {showUserFilter ? (
                  <div className="mb-2">
                    <TextInput placeholder="Filter users…" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
                  </div>
                ) : null}

                <Select value={authUserId} onChange={(e) => setAuthUserId(e.target.value)} className="w-full" aria-label="Users">
                  <option value="">
                    {usersLoading
                      ? "Loading…"
                      : filteredUsers.length
                        ? "Select a user…"
                        : users.length
                          ? "No matches"
                          : "No eligible users found"}
                  </option>
                  {filteredUsers.map((u) => (
                    <option key={u.auth_user_id} value={u.auth_user_id}>
                      {displayUser(u)}
                    </option>
                  ))}
                </Select>

                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  Selected: {selectedUser ? displayUser(selectedUser) : "—"}
                  {isItgSupervisor ? " • ITG Supervisor: org membership locked (single-org)" : ""}
                </div>
              </Field>

              <Field label="Advanced (optional)">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => setAdvancedOpen((v) => !v)} disabled={!authUserId}>
                    {advancedOpen ? "Hide advanced" : "Add notes / expiry"}
                  </Button>
                  <div className="text-xs text-[var(--to-ink-muted)]">
                    {advancedOpen ? "Applies to the next GRANT only." : "Hidden by default."}
                  </div>
                </div>

                {advancedOpen ? (
                  <div className="mt-3 grid gap-3">
                    <TextInput
                      placeholder="Expires at (optional), e.g. 2026-02-01T00:00:00Z"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <TextInput placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                ) : null}
              </Field>
            </div>
          </Card>

          {!isItgSupervisor ? (
            <div className="mt-6">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Org membership (eligibility)</div>
                    <div className="text-xs text-[var(--to-ink-muted)]">
                      Adds/removes this user from <code>user_pc_org_eligibility</code>. (This controls which orgs they can access.)
                    </div>
                    {membershipLocked ? (
                      <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
                        Membership changes are locked for ITG Supervisors (single-org). Grants are still allowed.
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => (authUserId ? loadEligibilityForUser(authUserId) : null)}
                    disabled={!authUserId || eligLoading || membershipLocked}
                  >
                    {eligLoading ? "Loading…" : "Refresh"}
                  </Button>
                </div>

                {!authUserId ? (
                  <div className="mt-3">
                    <EmptyState title="Pick a user" message="Select a user above to manage their org membership." />
                  </div>
                ) : (
                  <>
                    <div className="mt-3">
                      <Field label="Filter orgs">
                        <TextInput
                          placeholder="Type an org name or ID…"
                          value={orgFilter}
                          onChange={(e) => setOrgFilter(e.target.value)}
                          disabled={membershipLocked}
                        />
                      </Field>
                    </div>

                    <div className="mt-3">
                      {!filteredOrgs.length ? (
                        <EmptyState title="No orgs" message="No orgs available in your org chooser list." />
                      ) : (
                        <DataTable layout="content">
                          <DataTableHeader>
                            <div>org</div>
                            <div>pc_org_id</div>
                            <div>member?</div>
                            <div></div>
                          </DataTableHeader>

                          <DataTableBody zebra>
                            {filteredOrgs.map((o) => {
                              const id = String(o.pc_org_id ?? "");
                              const name = String(o.pc_org_name ?? o.org_name ?? o.name ?? id);
                              const on = id ? eligibleOrgIds.has(id) : false;
                              return (
                                <DataTableRow key={id || name}>
                                  <div className="min-w-0">
                                    <div className="truncate">{name}</div>
                                  </div>
                                  <div className="text-xs">{id}</div>
                                  <div>{on ? "Yes" : "No"}</div>
                                  <div>
                                    <Button
                                      variant="secondary"
                                      type="button"
                                      onClick={() => (membershipLocked ? null : id ? toggleOrgEligibility(id) : null)}
                                      disabled={!id || eligLoading || membershipLocked}
                                    >
                                      {membershipLocked ? "Locked" : on ? "Remove" : "Add"}
                                    </Button>
                                  </div>
                                </DataTableRow>
                              );
                            })}
                          </DataTableBody>
                        </DataTable>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Permissions (toggle on/off)</div>
                  {authUserId ? (
                    viewerLoading ? (
                      <div className="text-xs text-[var(--to-ink-muted)]">Checking admin…</div>
                    ) : viewerIsOwner ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={grantManagerBundle}
                          disabled={bundleBusy || loading || managerBundleKeys.length === 0}
                          title="Grant the standard Manager Bundle"
                        >
                          {bundleBusy ? "Working…" : "Grant Manager Bundle"}
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={revokeManagerBundle}
                          disabled={bundleBusy || loading || managerBundleKeys.length === 0 || managerBundleGrantedCount === 0}
                          title="Revoke the standard Manager Bundle"
                        >
                          {bundleBusy ? "Working…" : "Revoke Manager Bundle"}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--to-ink-muted)]">Manager Bundle is owner-only.</div>
                    )
                  ) : null}
                </div>

                {authUserId ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={grantManagerBundle}
                      disabled={bundleBusy || loading || managerBundleKeys.length === 0}
                      title="Grant the standard Manager Bundle"
                    >
                      {bundleBusy ? "Working…" : "Grant Manager Bundle"}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={revokeManagerBundle}
                      disabled={bundleBusy || loading || managerBundleKeys.length === 0 || managerBundleGrantedCount === 0}
                      title="Revoke the standard Manager Bundle"
                    >
                      {bundleBusy ? "Working…" : "Revoke Manager Bundle"}
                    </Button>
                  </div>
                ) : null}
              </div>

              {!authUserId ? (
                <div className="mt-3">
                  <EmptyState title="Pick a user" message="Select a user above to view and manage their permissions." />
                </div>
              ) : !defs.length ? (
                <div className="mt-3">
                  <EmptyState title="No permission definitions" message="permission_def has no rows." />
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {defs.map((d) => {
                    const key = d.permission_key;
                    const on = grantedKeys.has(key);
                    return (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[var(--to-border)] p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{key}</div>
                          <div className="text-xs text-[var(--to-ink-muted)]">{d.description ?? "—"}</div>
                          {on ? (
                            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                              Granted.{" "}
                              {grantsForSelectedUser.find((g) => g.permission_key === key)?.expires_at ? (
                                <>
                                  Expires:{" "}
                                  {fmt(grantsForSelectedUser.find((g) => g.permission_key === key)?.expires_at as any)}
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <Button type="button" variant="secondary" onClick={() => togglePermission(key)} disabled={loading || bundleBusy}>
                          {on ? "Revoke" : "Grant"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold">Current grants (selected user)</div>

              {!authUserId ? (
                <div className="mt-3">
                  <EmptyState title="Pick a user" message="Select a user above." />
                </div>
              ) : !grantsForSelectedUser.length ? (
                <div className="mt-3">
                  <EmptyState title="No grants yet" message="Use the left panel to grant a permission." />
                </div>
              ) : (
                <div className="mt-3">
                  <DataTable layout="content">
                    <DataTableHeader>
                      <div>permission_key</div>
                      <div>expires_at</div>
                      <div>notes</div>
                      <div>created_at</div>
                      <div></div>
                    </DataTableHeader>

                    <DataTableBody zebra>
                      {grantsForSelectedUser.map((g, i) => (
                        <DataTableRow key={`${g.auth_user_id}-${g.permission_key}-${i}`}>
                          <div>{String(g.permission_key ?? "")}</div>
                          <div>{fmt(g.expires_at as any)}</div>
                          <div>{g.notes ?? "—"}</div>
                          <div>{fmt(g.created_at as any)}</div>
                          <div>
                            <Button variant="secondary" type="button" onClick={() => togglePermission(String(g.permission_key ?? ""))}>
                              Revoke
                            </Button>
                          </div>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}