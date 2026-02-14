"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  reportsToOptions: Array<[string, string]>;
  selectedReportsTo: string;
};

export default function ReportsFilterBar({
  reportsToOptions,
  selectedReportsTo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const baseParams = useMemo(() => {
    // Keep whatever is already in the URL (including fiscal)
    const p = new URLSearchParams(sp.toString());
    // Ensure reports_to always exists for consistent UX
    if (!p.get("reports_to")) p.set("reports_to", selectedReportsTo);
    return p;
  }, [sp, selectedReportsTo]);

  function pushWith(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onReportsToChange(v: string) {
    const next = new URLSearchParams(baseParams.toString());
    next.set("reports_to", v);
    pushWith(next);
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="reports_to"
        className="text-sm text-[var(--to-ink-muted)]"
      >
        Reports To
      </label>

      <select
        id="reports_to"
        value={selectedReportsTo}
        onChange={(e) => onReportsToChange(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm bg-white"
      >
        <option value="ALL">All</option>
        {reportsToOptions.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}