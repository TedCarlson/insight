// path: apps/web/src/features/metrics-admin/components/RubricEditor.tsx

"use client";

import React from "react";
import {
  RUBRIC_BANDS,
  RubricRow,
  RubricBandKey,
} from "@/features/metrics-admin/lib/rubric";

const DECIMAL_INPUT = /^-?\d*([.,]\d{0,2})?$/;

type Props = {
  classType: string;
  kpiKey: string;
  mso_id?: string | null;
  existingRows: RubricRow[];
  onSave: (rows: RubricRow[]) => Promise<void>;
};

type DraftRow = {
  band_key: RubricBandKey;
  min_value: string;
  max_value: string;
  score_value: string;
};

function buildDraftRows(existingRows: RubricRow[]): DraftRow[] {
  return RUBRIC_BANDS.map((band) => {
    const found = existingRows.find((row) => row.band_key === band);
    return {
      band_key: band,
      min_value: found?.min_value == null ? "" : String(found.min_value),
      max_value: found?.max_value == null ? "" : String(found.max_value),
      score_value: found?.score_value == null ? "" : String(found.score_value),
    };
  });
}

function normalizeDecimalString(value: string): string {
  return value.replace(/,/g, ".");
}

function parseDecimal(value: string): number | null {
  const trimmed = normalizeDecimalString(value).trim();
  if (!trimmed) return null;
  if (!DECIMAL_INPUT.test(value.trim())) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  return Math.round(parsed * 100) / 100;
}

export default function RubricEditor({
  classType,
  kpiKey,
  mso_id,
  existingRows,
  onSave,
}: Props) {
  const contextKey = `${classType}::${kpiKey}::${mso_id ?? "global"}`;

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draftRows, setDraftRows] = React.useState<DraftRow[]>(() =>
    buildDraftRows(existingRows)
  );

  React.useEffect(() => {
    setDraftRows(buildDraftRows(existingRows));
  }, [contextKey, existingRows]);

  function updateDraftRow(
    band: RubricBandKey,
    field: "min_value" | "max_value" | "score_value",
    value: string
  ) {
    const next = value.trim() === "" ? "" : value;

    if (next !== "" && !DECIMAL_INPUT.test(next)) {
      return;
    }

    setDraftRows((prev) =>
      prev.map((row) =>
        row.band_key === band ? { ...row, [field]: next } : row
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const rows: RubricRow[] = draftRows.map((row) => ({
        mso_id: mso_id ?? null,
        class_type: classType,
        kpi_key: kpiKey,
        band_key: row.band_key,
        min_value: parseDecimal(row.min_value),
        max_value: parseDecimal(row.max_value),
        score_value: parseDecimal(row.score_value),
      }));

      await onSave(rows);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        className="text-xs underline text-muted-foreground"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {open ? "Hide Rubric" : "Edit Rubric"}
      </button>

      {open ? (
        <div className="mt-3 space-y-2 rounded-md border p-3">
          {draftRows.map((row) => (
            <div
              key={row.band_key}
              className="grid grid-cols-4 items-center gap-3 text-sm"
            >
              <div className="font-medium">{row.band_key}</div>

              <input
                className="rounded border px-2 py-1"
                placeholder="Min"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={row.min_value}
                onChange={(e) =>
                  updateDraftRow(row.band_key, "min_value", e.target.value)
                }
              />

              <input
                className="rounded border px-2 py-1"
                placeholder="Max"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={row.max_value}
                onChange={(e) =>
                  updateDraftRow(row.band_key, "max_value", e.target.value)
                }
              />

              <input
                className="rounded border px-2 py-1"
                placeholder="Score"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={row.score_value}
                onChange={(e) =>
                  updateDraftRow(row.band_key, "score_value", e.target.value)
                }
              />
            </div>
          ))}

          <div className="pt-2">
            <button
              className="rounded bg-primary px-3 py-1 text-xs text-white disabled:opacity-50"
              disabled={saving}
              onClick={handleSave}
              type="button"
            >
              {saving ? "Saving..." : "Save Rubric"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}