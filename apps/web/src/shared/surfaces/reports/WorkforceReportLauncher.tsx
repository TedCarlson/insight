"use client";

import { useState } from "react";
import { WorkforceReportModal } from "./WorkforceReportModal";

type Props = {
  regionLabel: string;
  reportMonthLabel: string;
};

export function WorkforceReportLauncher({
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
        Workforce Report
      </button>

      <WorkforceReportModal
        open={open}
        onClose={() => setOpen(false)}
        regionLabel={regionLabel}
        reportMonthLabel={reportMonthLabel}
      />
    </>
  );
}