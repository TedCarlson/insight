// path: apps/web/src/shared/surfaces/reports/ExhibitModal.tsx

"use client";

import { useMemo, useRef } from "react";
import type { WorkforceAffiliationOption } from "@/shared/types/workforce/surfacePayload";
import type { WorkforceRow } from "@/shared/types/workforce/workforce.types";

type Props = {
  open: boolean;
  rows: WorkforceRow[];
  affiliations: WorkforceAffiliationOption[];
  regionLabel: string;
  reportMonthLabel: string;
  onClose: () => void;
};

type ExhibitType = "FULFILLMENT" | "MDU / DROP";
type WorkerClass = "W2" | "1099";

type ExhibitLine = {
  type: ExhibitType;
  workerClass: WorkerClass;
  area: string;
  w2: number;
  contractor: number;
};

function isTechnician(row: WorkforceRow) {
  const title = String(row.position_title ?? "").toLowerCase();

  return (
    row.is_active &&
    row.seat_type !== "LEADERSHIP" &&
    row.seat_type !== "SUPPORT" &&
    row.seat_type !== "FMLA" &&
    (row.seat_type === "DROP_BURY" || title.includes("technician"))
  );
}

function isMduDrop(row: WorkforceRow) {
  if (row.seat_type === "DROP_BURY") return true;

  const text = `${row.position_title ?? ""} ${row.affiliation ?? ""}`.toLowerCase();
  return text.includes("mdu") || text.includes("drop");
}

function getAffiliationMeta(
  row: WorkforceRow,
  affiliations: WorkforceAffiliationOption[]
) {
  return affiliations.find(
    (option) =>
      option.affiliation_id === row.affiliation_id ||
      option.affiliation_label === row.affiliation ||
      option.affiliation_code === row.affiliation
  );
}

function getWorkerClass(
  row: WorkforceRow,
  affiliations: WorkforceAffiliationOption[]
): WorkerClass {
  const meta = getAffiliationMeta(row, affiliations);
  const label = String(row.affiliation ?? "").toLowerCase();

  if (meta?.affiliation_type === "COMPANY") return "W2";
  if (label.includes("integrated tech group") || label === "itg") return "W2";

  return "1099";
}

function buildExhibitRows(
  rows: WorkforceRow[],
  affiliations: WorkforceAffiliationOption[]
): ExhibitLine[] {
  const map = new Map<string, ExhibitLine>();

  for (const row of rows.filter(isTechnician)) {
    const type: ExhibitType = isMduDrop(row) ? "MDU / DROP" : "FULFILLMENT";
    const workerClass = getWorkerClass(row, affiliations);
    const meta = getAffiliationMeta(row, affiliations);
    const area = meta?.affiliation_label ?? row.affiliation ?? "Unassigned";
    const affiliationKey = row.affiliation_id ?? area;
    const key = `${type}::${workerClass}::${affiliationKey}`;

    const existing =
      map.get(key) ??
      ({
        type,
        workerClass,
        area,
        w2: 0,
        contractor: 0,
      } satisfies ExhibitLine);

    if (workerClass === "W2") {
      existing.w2 += 1;
    } else {
      existing.contractor += 1;
    }

    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.workerClass !== b.workerClass) return a.workerClass === "W2" ? -1 : 1;
    if (a.area === "Integrated Tech Group") return -1;
    if (b.area === "Integrated Tech Group") return 1;
    return a.area.localeCompare(b.area);
  });
}

function csvEscape(value: string | number) {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function displayCount(value: number) {
  return value === 0 ? "" : String(value);
}

function buildCsv(lines: ExhibitLine[], regionLabel: string) {
  const rows = [
    [regionLabel],
    ["Type", "Area", "W2", "1099", "Total"],
    ...lines.map((line) => [
      line.type,
      line.area,
      displayCount(line.w2),
      displayCount(line.contractor),
      displayCount(line.w2 + line.contractor),
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function total(lines: ExhibitLine[], type?: ExhibitType) {
  return lines
    .filter((line) => !type || line.type === type)
    .reduce(
      (acc, line) => ({
        w2: acc.w2 + line.w2,
        contractor: acc.contractor + line.contractor,
      }),
      { w2: 0, contractor: 0 }
    );
}

export default function ExhibitModal({
  open,
  rows,
  affiliations,
  regionLabel,
  reportMonthLabel,
  onClose,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const exhibitRows = useMemo(
    () => buildExhibitRows(rows, affiliations),
    [rows, affiliations]
  );

  const fulfillmentTotal = total(exhibitRows, "FULFILLMENT");
  const mduTotal = total(exhibitRows, "MDU / DROP");
  const regionTotal = total(exhibitRows);

  if (!open) return null;

  function downloadCsv() {
    const blob = new Blob([buildCsv(exhibitRows, regionLabel)], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `Exhibit - ${regionLabel} - ${reportMonthLabel}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function printPdf() {
    const html = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");

    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Exhibit - ${regionLabel} - ${reportMonthLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #444; padding: 6px 8px; font-size: 12px; }
            th { background: #eee; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl border bg-background p-5 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Workforce Report
            </div>
            <h2 className="mt-1 text-lg font-semibold">Exhibit</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {regionLabel} • {reportMonthLabel}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              CSV
            </button>

            <button
              type="button"
              onClick={printPdf}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div ref={printRef} className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border px-3 py-2 text-left" colSpan={5}>
                  {regionLabel}
                </th>
              </tr>
              <tr>
                <th className="border px-3 py-2 text-left">Type</th>
                <th className="border px-3 py-2 text-left">Area</th>
                <th className="border px-3 py-2 text-right">W2</th>
                <th className="border px-3 py-2 text-right">1099</th>
                <th className="border px-3 py-2 text-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {exhibitRows.map((row, index) => {
                const previous = exhibitRows[index - 1];
                const showType = !previous || previous.type !== row.type;

                return (
                  <tr key={`${row.type}-${row.area}`}>
                    <td className="border px-3 py-2">
                      {showType ? row.type : ""}
                    </td>
                    <td className="border px-3 py-2 font-medium">{row.area}</td>
                    <td className="border px-3 py-2 text-right">
                      {displayCount(row.w2)}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      {displayCount(row.contractor)}
                    </td>
                    <td className="border px-3 py-2 text-right">
                      
                    </td>
                  </tr>
                );
              })}

              <tr className="font-semibold">
                <td className="border px-3 py-2" colSpan={2}>
                  Fulfillment Total
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(fulfillmentTotal.w2)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(fulfillmentTotal.contractor)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(fulfillmentTotal.w2 + fulfillmentTotal.contractor)}
                </td>
              </tr>

              <tr className="font-semibold">
                <td className="border px-3 py-2" colSpan={2}>
                  MDU / DROP
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(mduTotal.w2)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(mduTotal.contractor)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(mduTotal.w2 + mduTotal.contractor)}
                </td>
              </tr>

              <tr className="font-semibold">
                <td className="border px-3 py-2" colSpan={2}>
                  {regionLabel} Total
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(regionTotal.w2)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(regionTotal.contractor)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {displayCount(regionTotal.w2 + regionTotal.contractor)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}