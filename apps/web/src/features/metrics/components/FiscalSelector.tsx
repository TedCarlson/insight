"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FiscalSelector({
  options,
  selected,
}: {
  options: string[];
  selected: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function handleChange(value: string) {
    const newParams = new URLSearchParams(params.toString());
    newParams.set("fiscal", value);
    router.replace(`/metrics/reports?${newParams.toString()}`);
  }

  return (
    <div>
      <label className="text-xs font-medium text-[var(--to-ink-muted)]">
        Fiscal Month
      </label>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="ml-3 border rounded px-2 py-1 text-sm"
      >
        {options.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </div>
  );
}