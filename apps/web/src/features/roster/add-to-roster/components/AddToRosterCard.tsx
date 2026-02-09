// apps/web/src/features/roster/add-to-roster/components/AddToRosterCard.tsx
"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

import { AddToRosterDrawer } from "@/features/roster/add-to-roster/components/AddToRosterDrawer";

export type AddToRosterCardProps = {
  pcOrgId: string | null;
  pcOrgName?: string | null;

  canEdit: boolean;
  disabled?: boolean;
  onAdded?: () => void;

  excludePersonIds?: Set<string>;
};

export function AddToRosterCard({
  pcOrgId,
  pcOrgName,
  canEdit,
  disabled = false,
  onAdded,
  excludePersonIds,
}: AddToRosterCardProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);

  // increments each time we open, used to reset search/draft state downstream
  const [resetKey, setResetKey] = useState(0);

  const enabled = useMemo(() => Boolean(pcOrgId) && canEdit && !disabled, [pcOrgId, canEdit, disabled]);

  return (
    <>
      <Card className="px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Add to roster</div>
            <div className="text-[12px] leading-4 text-[var(--to-ink-muted)]">
              Search existing people and add membership.
            </div>
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

              setResetKey((n) => n + 1);
              setOpen(true);
            }}
          >
            Add
          </Button>
        </div>
      </Card>

      {/* ✅ mount only when open — nothing should “begin rendering” before user clicks Add */}
      {pcOrgId && open ? (
        <AddToRosterDrawer
          key={`add-to-roster-${pcOrgId}-${resetKey}`} // forces clean mount each open
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

export default AddToRosterCard;