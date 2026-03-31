"use client";

import WorkforceHeaderCell from "./WorkforceHeaderCell";
import WorkforceIdentityCell from "./WorkforceIdentityCell";
import WorkforceJobsCell from "./WorkforceJobsCell";
import WorkforceMetricButtonCell from "./WorkforceMetricButtonCell";
import type { WorkforceRosterTableProps } from "./workforceTable.types";

export default function WorkforceRosterTable({
  columns,
  rows,
  rubricByKpi,
  activeKpiKey,
  setActiveKpiKey,
  activeWorkMixTechId,
  onToggleWorkMix,
  onCloseAllOverlays,
  onMetricSelect,
}: WorkforceRosterTableProps) {
  const rubricMap = rubricByKpi ?? new Map();

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b bg-[color-mix(in_oklab,var(--to-primary)_4%,white)]">
            <th className="w-[300px] px-4 py-4 text-left text-[11px] font-medium text-[color-mix(in_oklab,var(--to-primary)_72%,black)]">
              Tech
            </th>

            {columns.map((column, index) => (
              <WorkforceHeaderCell
                key={column.kpi_key}
                column={column}
                rubric={rubricMap.get(column.kpi_key)}
                activeKey={activeKpiKey}
                setActiveKey={(value) => {
                  onCloseAllOverlays();
                  setActiveKpiKey(value);
                }}
                sectionStart={index === 0}
              />
            ))}

            <th className="border-l border-[var(--to-border)] px-3 py-4 text-center text-[11px] font-medium text-[color-mix(in_oklab,var(--to-primary)_72%,black)]">
              Jobs
            </th>

            <th className="w-[56px] border-l border-[var(--to-border)] px-3 py-4 text-center text-[11px] font-medium text-[color-mix(in_oklab,var(--to-primary)_72%,black)]">
              Risk
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.tech_id}
              className={[
                "border-b last:border-b-0",
                rowIndex > 0 && rowIndex % 4 === 0
                  ? "border-t-2 border-t-[var(--to-border)]"
                  : "",
              ].join(" ")}
            >
              <td className="w-[300px] px-4 py-4 align-middle">
                <WorkforceIdentityCell row={row} />
              </td>

              {columns.map((column, columnIndex) => {
                const metric = row.metrics.find(
                  (entry) => entry.kpi_key === column.kpi_key
                );

                return (
                  <td
                    key={column.kpi_key}
                    className={[
                      "px-2 py-3 align-middle",
                      columnIndex === 0 ? "border-l border-[var(--to-border)]" : "",
                      columnIndex === 3 ? "border-l border-[var(--to-border)]" : "",
                    ].join(" ")}
                  >
                    <WorkforceMetricButtonCell
                      metric={metric}
                      onClick={
                        metric
                          ? () => onMetricSelect(row, column, metric)
                          : undefined
                      }
                    />
                  </td>
                );
              })}

              <WorkforceJobsCell
                row={row}
                isOpen={activeWorkMixTechId === row.tech_id}
                onToggle={() => onToggleWorkMix(row.tech_id)}
                onClose={onCloseAllOverlays}
              />

              <td className="border-l border-[var(--to-border)] px-3 py-4 text-center text-sm font-medium align-middle">
                {row.below_target_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}