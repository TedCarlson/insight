// path: apps/web/src/shared/surfaces/reports/ExhibitLauncher.tsx

"use client";

import { useState } from "react";
import type { WorkforceAffiliationOption } from "@/shared/types/workforce/surfacePayload";
import type { WorkforceRow } from "@/shared/types/workforce/workforce.types";
import ExhibitModal from "./ExhibitModal";

type Props = {
  rows: WorkforceRow[];
  affiliations: WorkforceAffiliationOption[];
  regionLabel: string;
  reportMonthLabel: string;
};

export function ExhibitLauncher({
  rows,
  affiliations,
  regionLabel,
  reportMonthLabel,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border px-4 py-2 text-sm"
      >
        Exhibit
      </button>

      <ExhibitModal
        open={open}
        rows={rows}
        affiliations={affiliations}
        regionLabel={regionLabel}
        reportMonthLabel={reportMonthLabel}
        onClose={() => setOpen(false)}
      />
    </>
  );
}