import PopoverPanel from "@/components/ui/PopoverPanel";

import type { WorkforceWorkMixPopoverProps } from "./workforceTable.types";

function fmt(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString();
}

export default function WorkforceWorkMixPopover({
  row,
  onClose,
}: WorkforceWorkMixPopoverProps) {
  const mix = row.work_mix;

  return (
    <PopoverPanel onClose={onClose} align="right" widthClass="w-56">
      <div className="mb-2 text-xs font-semibold">Work Mix</div>

      <div className="flex flex-col gap-1 text-[11px]">
        <div className="flex items-center justify-between">
          <span>Installs</span>
          <span>{fmt(mix.installs)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span>TCs</span>
          <span>{fmt(mix.tcs)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span>SROs</span>
          <span>{fmt(mix.sros)}</span>
        </div>

        <div className="mt-1 flex items-center justify-between border-t pt-1 font-semibold">
          <span>Total</span>
          <span>{fmt(mix.total)}</span>
        </div>
      </div>
    </PopoverPanel>
  );
}