import WorkforceRubricPopover from "./WorkforceRubricPopover";
import type { WorkforceHeaderCellProps } from "./workforceTable.types";

function displayHeaderLabel(label: string) {
  if (label === "Tool Usage %") return "Tool Usage %";
  if (label === "Pure Pass %") return "Pure Pass %";
  if (label === "48hr Contact") return "48hr Contact";
  return label;
}

function HeaderTrigger(props: {
  label: string;
  onClick?: () => void;
  compact?: boolean;
  align?: "left" | "center" | "right";
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "inline-flex items-center text-[10px] font-medium text-[var(--to-primary)] transition hover:text-[color-mix(in_oklab,var(--to-primary)_75%,black)]",
        props.compact ? "" : "uppercase tracking-wide",
        props.align === "right" ? "justify-end" : "",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

export default function WorkforceHeaderCell({
  column,
  rubric,
  activeKey,
  setActiveKey,
  sectionStart,
}: WorkforceHeaderCellProps) {
  const isOpen = activeKey === column.kpi_key;

  return (
    <th
      className={[
        "relative px-3 py-3 text-center align-bottom text-[10px] font-medium text-[color-mix(in_oklab,var(--to-primary)_70%,black)]",
        sectionStart ? "border-l border-[var(--to-border)]" : "",
        isOpen ? "z-20" : "",
      ].join(" ")}
    >
      <HeaderTrigger
        compact
        label={displayHeaderLabel(column.label)}
        onClick={() => setActiveKey(isOpen ? null : column.kpi_key)}
      />

      {isOpen && rubric && rubric.length > 0 ? (
        <div className="absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2">
          <WorkforceRubricPopover
            label={column.label}
            rubric={rubric}
            onClose={() => setActiveKey(null)}
          />
        </div>
      ) : null}
    </th>
  );
}