// apps/web/src/features/roster/components/RosterHeaderCards.tsx
"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

import { AddToRosterDrawer } from "@/features/roster/add-to-roster/components/AddToRosterDrawer";

function MetaRow(props: { items: Array<{ k: string; v: string }> }) {
  return (
    <div className="min-w-0 text-[12px] leading-4 text-[var(--to-ink-muted)] whitespace-nowrap overflow-hidden text-ellipsis">
      {props.items.map((it, idx) => (
        <span key={it.k}>
          <span>{it.k}:</span> <span className="text-[var(--to-ink)]">{it.v}</span>
          {idx < props.items.length - 1 ? <span className="px-2">•</span> : null}
        </span>
      ))}
    </div>
  );
}

export type RosterHeaderCardsProps = {
  validatedOrgId: string | null;
  selectedOrgName: string | null;

  canEditRoster: boolean;
  addToRosterDisabled: boolean;

  orgMetaLoading: boolean;
  orgMeta: any;

  onAdded: () => void;

  excludePersonIds?: Set<string>;
};

export function RosterHeaderCards({
  validatedOrgId,
  selectedOrgName,
  canEditRoster,
  addToRosterDisabled,
  orgMetaLoading,
  orgMeta,
  onAdded,
  excludePersonIds,
}: RosterHeaderCardsProps) {
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const enabled = useMemo(
    () => Boolean(validatedOrgId) && canEditRoster && !addToRosterDisabled,
    [validatedOrgId, canEditRoster, addToRosterDisabled]
  );

  const pcLabel = selectedOrgName ?? "—";

  if (!validatedOrgId) {
    return (
      <Card variant="subtle">
        <Toolbar
          left={<div className="text-sm text-[var(--to-ink-muted)]">Select a PC org in the header to load the roster.</div>}
          right={null}
        />
      </Card>
    );
  }

  return (
    <>
      <Card variant="subtle">
        <Toolbar
          left={
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-2 items-stretch">
              {/* Card 1 */}
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
                      if (!validatedOrgId) return;

                      if (!canEditRoster) {
                        toast.push({
                          title: "Permission required",
                          message: "You need roster_manage (or owner) to add people to the roster.",
                          variant: "warning",
                        });
                        return;
                      }

                      if (addToRosterDisabled) return;

                      setResetKey((n) => n + 1);
                      setOpen(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </Card>

              {/* Card 2 */}
              <Card className="px-3 py-2">
                <div className="min-w-0">
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold">Roster</span>
                    <span className="px-2 text-[var(--to-ink-muted)]">•</span>
                    <span className="text-[var(--to-ink-muted)]">PC #</span>{" "}
                    <span className="font-semibold">{pcLabel}</span>
                  </div>

                  <div className="mt-1">
                    <MetaRow
                      items={[
                        { k: "MSO", v: orgMetaLoading ? "…" : orgMeta?.mso_name ?? "—" },
                        { k: "Division", v: orgMetaLoading ? "…" : orgMeta?.division_name ?? "—" },
                        { k: "Region", v: orgMetaLoading ? "…" : orgMeta?.region_name ?? "—" },
                      ]}
                    />
                  </div>
                </div>
              </Card>

              {/* Card 3 */}
              <Card className="px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Leadership</div>
                  <div className="mt-1">
                    <MetaRow
                      items={[
                        { k: "Manager", v: orgMetaLoading ? "…" : orgMeta?.pc_lead_label ?? "—" },
                        { k: "Director", v: orgMetaLoading ? "…" : orgMeta?.director_label ?? "—" },
                        { k: "VP", v: orgMetaLoading ? "…" : orgMeta?.vp_label ?? "—" },
                      ]}
                    />
                  </div>
                </div>
              </Card>
            </div>
          }
          right={null}
        />
      </Card>

      {open ? (
        <AddToRosterDrawer
          key={`add-to-roster-${validatedOrgId}-${resetKey}`}
          open={open}
          onClose={() => setOpen(false)}
          pcOrgId={validatedOrgId}
          pcOrgName={selectedOrgName}
          canEdit={canEditRoster}
          onAdded={onAdded}
          excludePersonIds={excludePersonIds}
        />
      ) : null}
    </>
  );
}