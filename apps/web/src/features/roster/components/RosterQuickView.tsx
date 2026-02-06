// apps/web/src/features/roster/components/RosterQuickView.tsx
"use client";

import { useMemo } from "react";
import type { RosterRow } from "@/shared/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { pickName } from "@/features/roster/lib/rosterFormat";

type ToastPush = (t: { title: string; message: string; variant: "success" | "warning" | "danger" }) => void;

export function RosterQuickView(props: {
  open: boolean;
  row: RosterRow | null;
  pos: { top: number; left: number } | null;
  onClose: () => void;
  toastPush: ToastPush;
}) {
  const { open, row, pos, onClose, toastPush } = props;

  const canRender = open && row && pos;
  const techId = useMemo(() => String((row as any)?.tech_id ?? "—"), [row]);

  const copyQuickContents = async () => {
    try {
      if (!row) return;

      const name = pickName(row);
      const personId = String((row as any)?.person_id ?? "—");

      const mobile = String((row as any)?.mobile ?? "—") || "—";
      const ntLogin = String((row as any)?.person_nt_login ?? "—") || "—";
      const csg = String((row as any)?.person_csg_id ?? "—") || "—";
      const affiliation = String((row as any)?.co_name ?? "—") || "—";
      const reportsTo = String((row as any)?.reports_to_full_name ?? "—") || "—";

      const pad = (k: string, n = 12) => (k + ":").padEnd(n, " ");

      const text =
        `${name}
Tech ID: ${techId} • Person: ${personId}

${pad("Mobile")}${mobile}
${pad("NT Login")}${ntLogin}
${pad("CSG")}${csg}
${pad("Affiliation")}${affiliation}
${pad("Reports To")}${reportsTo}`.trim();

      await navigator.clipboard.writeText(text);

      toastPush({ title: "Copied", message: "Quick view copied to clipboard.", variant: "success" });
    } catch {
      toastPush({ title: "Copy failed", message: "Could not copy to clipboard.", variant: "warning" });
    }
  };

  if (!canRender) return null;

  return (
    <div className="fixed inset-0 z-50" onMouseDown={onClose}>
      <div
        className="fixed z-50 w-[420px]"
        style={{ top: pos!.top, left: pos!.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{pickName(row!)}</div>
              <div className="text-xs text-[var(--to-ink-muted)]">Tech ID: {techId}</div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={copyQuickContents}>
                Copy
              </Button>
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm">
            <div className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 text-[var(--to-ink-muted)]">Mobile</div>
              <div className="col-span-8 font-medium">{(row as any)?.mobile ?? "—"}</div>
            </div>

            <div className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 text-[var(--to-ink-muted)]">NT Login</div>
              <div className="col-span-8 font-medium">{(row as any)?.person_nt_login ?? "—"}</div>
            </div>

            <div className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 text-[var(--to-ink-muted)]">CSG</div>
              <div className="col-span-8 font-medium">{(row as any)?.person_csg_id ?? "—"}</div>
            </div>

            <div className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 text-[var(--to-ink-muted)]">Affiliation</div>
              <div className="col-span-8 font-medium">{(row as any)?.co_name ?? "—"}</div>
            </div>

            <div className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-4 text-[var(--to-ink-muted)]">Reports To</div>
              <div className="col-span-8 font-medium">{(row as any)?.reports_to_full_name ?? "—"}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}