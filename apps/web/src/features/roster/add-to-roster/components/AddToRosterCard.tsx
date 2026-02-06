// apps/web/src/features/roster/add-to-roster/components/AddToRosterCard.tsx
"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

import { AddToRosterDrawer } from "@/features/roster/add-to-roster/components/AddToRosterDrawer";

type Props = {
  pcOrgId: string | null;
  pcOrgName?: string | null;

  canEdit: boolean;
  disabled?: boolean;
  onAdded?: () => void;

  // optional: if you have a set of person_ids already active in the roster
  excludePersonIds?: Set<string>;
};

export function AddToRosterCard({
  pcOrgId,
  pcOrgName,
  canEdit,
  disabled = false, // ✅ FIX: define it
  onAdded,
  excludePersonIds,
}: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const enabled = useMemo(() => Boolean(pcOrgId) && canEdit && !disabled, [pcOrgId, canEdit, disabled]);

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Add to roster</div>
            <div className="text-xs text-[var(--to-ink-muted)]">Search existing people and add membership for this PC.</div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="h-9 px-3 text-xs"
            disabled={!enabled}
            onClick={() => {
              if (!pcOrgId) return;

              if (!canEdit) {
                toast.push({
                  title: "Permission required",
                  message: "You need roster_manage (or owner) to add people to the roster.",
                  variant: "warning",
                });
                return;
              }

              if (disabled) return;

              setOpen(true);
            }}
          >
            Add
          </Button>
        </div>

        <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
          PC: <span className="text-[var(--to-ink)]">{pcOrgName ?? pcOrgId ?? "—"}</span>
          {!enabled ? <span className="ml-2">• locked</span> : null}
        </div>
      </Card>

      {pcOrgId ? (
        <AddToRosterDrawer
          open={open}
          onClose={() => setOpen(false)}
          pcOrgId={pcOrgId}
          pcOrgName={pcOrgName}
          canEdit={canEdit}
          onAdded={onAdded}
          excludePersonIds={excludePersonIds}
        />
      ) : null}
    </>
  );
}