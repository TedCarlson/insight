import WorkforceWorkMixPopover from "./WorkforceWorkMixPopover";
import type { WorkforceJobsCellProps } from "./workforceTable.types";

export default function WorkforceJobsCell({
  row,
  isOpen,
  onToggle,
  onClose,
}: WorkforceJobsCellProps) {
  return (
    <td className="relative border-l border-[var(--to-border)] px-2 py-2 align-middle">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 min-w-[54px] items-center justify-center rounded-xl border border-[var(--to-border)] bg-card px-2.5 text-[11px] font-medium transition hover:bg-muted/20"
        >
          {row.work_mix.total}
        </button>
      </div>

      {isOpen ? (
        <WorkforceWorkMixPopover row={row} onClose={onClose} />
      ) : null}
    </td>
  );
}