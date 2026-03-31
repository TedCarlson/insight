import PopoverPanel from "@/components/ui/PopoverPanel";

import type { WorkforceRubricPopoverProps } from "./workforceTable.types";

function formatRubricValue(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
}

export default function WorkforceRubricPopover({
  label,
  rubric,
  onClose,
}: WorkforceRubricPopoverProps) {
  return (
    <PopoverPanel onClose={onClose} align="center" widthClass="w-56">
      <div className="mb-2 text-xs font-semibold">{label}</div>

      {rubric.map((row) => (
        <div
          key={row.band_key}
          className="flex items-center justify-between gap-3 py-1 text-[10px]"
        >
          <span>{row.band_key}</span>
          <span>
            {formatRubricValue(row.min_value)} –{" "}
            {formatRubricValue(row.max_value)}
          </span>
        </div>
      ))}
    </PopoverPanel>
  );
}