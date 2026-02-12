"use client";

import React from "react";
import {
  RUBRIC_BANDS,
  RubricRow,
  RubricBandKey,
} from "@/features/metrics-admin/lib/rubric";

const DECIMAL_2 = /^-?\d*(\.\d{0,2})?$/;

type Props = {
  classType: string;
  kpiKey: string;
  mso_id?: string | null;
  existingRows: RubricRow[];
  onSave: (rows: RubricRow[]) => Promise<void>;
};

export default function RubricEditor({
  classType,
  kpiKey,
  mso_id,
  existingRows,
  onSave,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [rows, setRows] = React.useState<RubricRow[]>(() => {
    if (existingRows.length > 0) return existingRows;
    return RUBRIC_BANDS.map((band) => ({
      mso_id: mso_id ?? null,
      class_type: classType,
      kpi_key: kpiKey,
      band_key: band,
      min_value: null,
      max_value: null,
      score_value: null,
    }));
  });

  function updateRow(
    band: RubricBandKey,
    field: keyof RubricRow,
    value: number | null
  ) {
    setRows((prev) =>
      prev.map((r) =>
        r.band_key === band ? { ...r, [field]: value } : r
      )
    );
  }

  function parseDecimal(val: string) {
    if (!val.trim()) return null;
    if (!DECIMAL_2.test(val)) return null;
    const n = Number(val);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }

  async function handleSave() {
    setSaving(true);
    await onSave(rows);
    setSaving(false);
  }

  return (
    <div className="mt-2">
      <button
        className="text-xs underline text-muted-foreground"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide Rubric" : "Edit Rubric"}
      </button>

      {open && (
        <div className="mt-3 border rounded-md p-3 space-y-2">
          {rows.map((r) => (
            <div
              key={r.band_key}
              className="grid grid-cols-4 gap-3 items-center text-sm"
            >
              <div className="font-medium">{r.band_key}</div>

              <input
                className="border rounded px-2 py-1"
                placeholder="Min"
                defaultValue={r.min_value ?? ""}
                onChange={(e) =>
                  updateRow(
                    r.band_key,
                    "min_value",
                    parseDecimal(e.target.value)
                  )
                }
              />

              <input
                className="border rounded px-2 py-1"
                placeholder="Max"
                defaultValue={r.max_value ?? ""}
                onChange={(e) =>
                  updateRow(
                    r.band_key,
                    "max_value",
                    parseDecimal(e.target.value)
                  )
                }
              />

              <input
                className="border rounded px-2 py-1"
                placeholder="Score"
                defaultValue={r.score_value ?? ""}
                onChange={(e) =>
                  updateRow(
                    r.band_key,
                    "score_value",
                    parseDecimal(e.target.value)
                  )
                }
              />
            </div>
          ))}

          <div className="pt-2">
            <button
              className="px-3 py-1 text-xs bg-primary text-white rounded disabled:opacity-50"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save Rubric"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}