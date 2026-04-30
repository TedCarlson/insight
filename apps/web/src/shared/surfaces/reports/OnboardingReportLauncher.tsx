// path: apps/web/src/shared/surfaces/reports/OnboardingReportLauncher.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { OnboardingReportModal, type OnboardingReportRow } from "./OnboardingReportModal";

type Props = {
  regionLabel: string;
  reportMonthLabel: string;
};

export function OnboardingReportLauncher({
  regionLabel,
  reportMonthLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<OnboardingReportRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCount() {

      const res = await fetch("/api/people/onboarding");
      const json = await res.json().catch(() => null);

      if (cancelled) return;

      setRows(json?.rows ?? []);
    }

    loadCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const onboardingCount = useMemo(() => {
    return rows.filter((row) => row.status === "onboarding").length;
  }, [rows]);

  return (
    <>
      <button
  type="button"
  onClick={() => setOpen(true)}
  className={[
    "rounded-xl border px-4 py-2 text-sm transition",
    onboardingCount > 0
      ? "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_12%,white)] text-[var(--to-ink)]"
      : "bg-muted/30 text-muted-foreground",
  ].join(" ")}
>
  Onboarding ({onboardingCount})
</button>

      <OnboardingReportModal
        open={open}
        rows={rows}
        onClose={() => setOpen(false)}
        regionLabel={regionLabel}
        reportMonthLabel={reportMonthLabel}
      />
    </>
  );
}