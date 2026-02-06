// apps/web/src/features/roster/add-to-roster/components/AddToRosterDrawer.tsx
"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";

import { PersonSearch } from "@/features/roster/add-to-roster/components/PersonSearch";
import { useAddToRoster } from "@/features/roster/add-to-roster/hooks/useAddToRoster";
import { formatPersonName, type PersonSearchRow } from "@/features/roster/add-to-roster/lib/personSearchFormat";

type Props = {
  open: boolean;
  onClose: () => void;

  pcOrgId: string;
  pcOrgName?: string | null;

  canEdit: boolean;
  onAdded?: () => void;

  excludePersonIds?: Set<string>;
};

export function AddToRosterDrawer({
  open,
  onClose,
  pcOrgId,
  pcOrgName,
  canEdit,
  onAdded,
  excludePersonIds,
}: Props) {
  const toast = useToast();
  const { loading, error, add } = useAddToRoster();

  const [selected, setSelected] = useState<PersonSearchRow | null>(null);
  const [positionTitle, setPositionTitle] = useState("Technician");
  const [reportsToPersonId, setReportsToPersonId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const canSubmit = useMemo(() => {
    if (!canEdit) return false;
    if (loading) return false;
    if (!pcOrgId) return false;
    if (!selected?.person_id) return false;
    if (!String(positionTitle).trim()) return false;
    return true;
  }, [canEdit, loading, pcOrgId, selected, positionTitle]);

  if (!open) return null;

  async function onSubmit() {
    if (!canSubmit || !selected) return;

    try {
      await add({
        pcOrgId,
        personId: selected.person_id,
        positionTitle: positionTitle.trim(),
        reportsToPersonId: reportsToPersonId.trim() ? reportsToPersonId.trim() : null,
        startDate: startDate.trim() ? startDate.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });

      toast.push({
        title: "Added to roster",
        message: `${formatPersonName(selected)} was added successfully.`,
        variant: "success",
      });

      onAdded?.();
      onClose();
    } catch (e: any) {
      toast.push({
        title: "Add failed",
        message: e?.message ?? "Could not add this person to the roster.",
        variant: "warning",
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onMouseDown={onClose} />

      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-[520px]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="h-full p-3">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Add to roster</div>
                <div className="text-xs text-[var(--to-ink-muted)]">
                  PC: <span className="text-[var(--to-ink)]">{pcOrgName ?? pcOrgId}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>

            {!canEdit ? (
              <div className="mt-3">
                <Notice variant="danger" title="Permission required">
                  <div className="text-sm">You need roster_manage (or owner) to add people to the roster.</div>
                </Notice>
              </div>
            ) : null}

            <div className="mt-3 grid gap-3">
              <PersonSearch
                value={selected?.person_id ?? null}
                onChange={(p) => setSelected(p)}
                disabled={!canEdit}
                excludePersonIds={excludePersonIds}
              />

              <div className="grid gap-2">
                <div className="text-xs text-[var(--to-ink-muted)]">Position title</div>
                <TextInput
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  className="h-10"
                  disabled={!canEdit}
                  placeholder="Technician / Supervisor / …"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-[var(--to-ink-muted)]">Reports to (person_id optional)</div>
                <TextInput
                  value={reportsToPersonId}
                  onChange={(e) => setReportsToPersonId(e.target.value)}
                  className="h-10"
                  disabled={!canEdit}
                  placeholder="UUID (optional)"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-[var(--to-ink-muted)]">Start date (optional)</div>
                <TextInput
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                  disabled={!canEdit}
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-[var(--to-ink-muted)]">Notes (optional)</div>
                <TextInput
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10"
                  disabled={!canEdit}
                  placeholder="Reason, context, etc."
                />
              </div>

              {error ? (
                <Notice variant="danger" title="Add failed">
                  <div className="text-sm">{error}</div>
                </Notice>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" className="h-10 px-4 text-sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" className="h-10 px-4 text-sm" disabled={!canSubmit} onClick={onSubmit}>
                  {loading ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}