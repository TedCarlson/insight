// apps/web/src/app/admin/edge-permissions/EdgePermissionsClient.tsx
"use client";

import { useOrg } from "@/state/org";

export default function EdgePermissionsClient() {
  // safe now because /app/admin/layout.tsx wraps OrgProvider
  const { selectedOrgId, orgsLoading, orgsError } = useOrg();

  return (
    <div className="grid gap-3">
      <h1 className="text-xl font-semibold">Edge permissions</h1>

      {orgsError ? (
        <p className="text-sm text-[var(--to-danger)]">{orgsError}</p>
      ) : orgsLoading ? (
        <p className="text-sm text-[var(--to-ink-muted)]">Loading org scope…</p>
      ) : (
        <p className="text-sm text-[var(--to-ink-muted)]">
          Selected PC: <span className="font-medium">{selectedOrgId ?? "none"}</span>
        </p>
      )}

      <p className="text-sm text-[var(--to-ink-muted)]">
        Placeholder UI. We’ll wire the real permissions table next.
      </p>
    </div>
  );
}