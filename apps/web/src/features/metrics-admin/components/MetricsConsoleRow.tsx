// apps/web/src/features/metrics-admin/components/MetricsConsoleRow.tsx

"use client";

import * as React from "react";
import type { GridState } from "@/features/metrics-admin/lib/gridShape";
import { BANDS } from "@/features/metrics-admin/lib/gridUtils";
import { computeRubricDefaults } from "@/features/metrics-admin/lib/spillDefaults";

type ClassType = "P4P" | "SMART" | "TECH";

type Props = {
  kpiKey: string;
  state: GridState;
  setState: React.Dispatch<React.SetStateAction<GridState>>;
};

const CLASSES: ClassType[] = ["P4P", "SMART", "TECH"];

const WEIGHT_CAP = 100;
const GRADE_CAP = 10;

type DraftField = "weight_percent" | "threshold" | "grade_value";

function safeCfg(state: GridState, classType: ClassType, kpiKey: string) {
  return state.classConfigByClass?.[classType]?.[kpiKey] ?? {};
}

function safeRubric(state: GridState, classType: ClassType, kpiKey: string) {
  return state.rubricByClass?.[classType]?.[kpiKey] ?? {};
}

function isDraftNumberish(s: string): boolean {
  // Allow in-progress decimals like ".", "1.", ".5" while typing.
  // Commit validates to a finite number.
  return /^\s*\d*(?:\.\d*)?\s*$/.test(s);
}

function toFiniteNumberOrNull(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function sumEnabledNumericField(
  state: GridState,
  classType: ClassType,
  field: DraftField,
  excludeKpiKey?: string
): number {
  const byKey = state.classConfigByClass?.[classType] ?? {};
  let sum = 0;

  for (const [key, cfg] of Object.entries<any>(byKey)) {
    if (excludeKpiKey && key === excludeKpiKey) continue;
    if (!cfg?.enabled) continue;

    const v = Number(cfg?.[field]);
    if (!Number.isFinite(v)) continue;
    sum += v;
  }

  return sum;
}

export default function MetricsConsoleRow({ kpiKey, state, setState }: Props) {
  const def = state.kpiDefsByKey?.[kpiKey];
  const label = def?.customer_label ?? def?.label ?? def?.kpi_key ?? kpiKey;
  const raw = def?.kpi_key ?? kpiKey;
  const direction: "HIGHER_BETTER" | "LOWER_BETTER" =
    def?.direction ?? "HIGHER_BETTER";

  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function draftKey(ct: ClassType, field: DraftField) {
    return `${ct}:${field}`;
  }

  function setDraft(ct: ClassType, field: DraftField, v: string) {
    const k = draftKey(ct, field);

    // Keep the input responsive and "normal" (don't strip '.' mid-typing).
    // Reject obviously invalid characters (letters, multiple dots, etc.).
    if (!isDraftNumberish(v) && v.trim() !== "") return;

    setDrafts((d) => ({ ...d, [k]: v }));
    setErrors((e) => {
      if (!e[k]) return e;
      const { [k]: _omit, ...rest } = e;
      return rest;
    });
  }

  function clearDraft(ct: ClassType, field: DraftField) {
    const k = draftKey(ct, field);
    setDrafts((d) => {
      if (!(k in d)) return d;
      const { [k]: _omit, ...rest } = d;
      return rest;
    });
    setErrors((e) => {
      if (!(k in e)) return e;
      const { [k]: _omit, ...rest } = e;
      return rest;
    });
  }

  function patchKpiDefCustomerLabel(v: string) {
    setState((s) => ({
      ...s,
      kpiDefsByKey: {
        ...s.kpiDefsByKey,
        [kpiKey]: { ...s.kpiDefsByKey[kpiKey], customer_label: v },
      },
    }));
  }

  function patchCfg(classType: ClassType, patch: Record<string, unknown>) {
    setState((s) => {
      const existing = s.classConfigByClass?.[classType]?.[kpiKey] ?? {};

      return {
        ...s,
        classConfigByClass: {
          ...s.classConfigByClass,
          [classType]: {
            ...s.classConfigByClass[classType],
            [kpiKey]: {
              class_type: classType,
              kpi_key: kpiKey,
              enabled: existing.enabled ?? false,
              ...existing,
              ...patch,
            },
          },
        },
      };
    });
  }

  function patchRubric(
    classType: ClassType,
    bandKey: string,
    patch: Record<string, unknown>
  ) {
    setState((s) => ({
      ...s,
      rubricByClass: {
        ...s.rubricByClass,
        [classType]: {
          ...s.rubricByClass[classType],
          [kpiKey]: {
            ...s.rubricByClass[classType][kpiKey],
            [bandKey]: {
              ...(s.rubricByClass[classType][kpiKey]?.[bandKey] ?? {}),
              ...patch,
            },
          },
        },
      },
    }));
  }

  function setRubricForClass(
    classType: ClassType,
    rubricMap: Record<string, any>
  ) {
    setState((s) => ({
      ...s,
      rubricByClass: {
        ...s.rubricByClass,
        [classType]: {
          ...s.rubricByClass[classType],
          [kpiKey]: {
            ...(s.rubricByClass[classType][kpiKey] ?? {}),
            ...rubricMap,
          },
        },
      },
    }));
  }

  function toggleClassEnabled(classType: ClassType, enabled: boolean) {
    patchCfg(classType, { enabled });
  }

  function getFieldDisplayValue(ct: ClassType, field: DraftField): string {
    const k = draftKey(ct, field);
    if (k in drafts) return drafts[k] ?? "";

    const cfg = safeCfg(state, ct, kpiKey);
    const v = (cfg as any)?.[field];
    return v ?? "";
  }

  function setFieldError(ct: ClassType, field: DraftField, message: string) {
    const k = draftKey(ct, field);
    setErrors((e) => ({ ...e, [k]: message }));
  }

  function commitNumericField(ct: ClassType, field: DraftField) {
    const k = draftKey(ct, field);
    if (!(k in drafts)) return; // nothing pending

    const cfg = safeCfg(state, ct, kpiKey);
    const enabled = !!cfg?.enabled;

    const rawVal = drafts[k] ?? "";
    const n = toFiniteNumberOrNull(rawVal);

    // Empty clears.
    if (n === null) {
      patchCfg(ct, { [field]: null });
      clearDraft(ct, field);
      return;
    }

    // Per-field sanity.
    if (n < 0) {
      setFieldError(ct, field, "Value must be ≥ 0.");
      return;
    }

    if (field === "weight_percent") {
      if (n > WEIGHT_CAP) {
        setFieldError(ct, field, `Weight must be ≤ ${WEIGHT_CAP}.`);
        return;
      }
      if (enabled) {
        const others = sumEnabledNumericField(state, ct, field, kpiKey);
        const nextTotal = others + n;
        if (nextTotal > WEIGHT_CAP + 1e-9) {
          setFieldError(
            ct,
            field,
            `Total weight for ${ct} would be ${nextTotal.toFixed(4)} (cap ${WEIGHT_CAP}).`
          );
          return;
        }
      }
    }

    if (field === "grade_value") {
      if (n > GRADE_CAP) {
        setFieldError(ct, field, `Grade must be ≤ ${GRADE_CAP}.`);
        return;
      }
      if (enabled) {
        const others = sumEnabledNumericField(state, ct, field, kpiKey);
        const nextTotal = others + n;
        if (nextTotal > GRADE_CAP + 1e-9) {
          setFieldError(
            ct,
            field,
            `Total grade for ${ct} would be ${nextTotal.toFixed(4)} (cap ${GRADE_CAP}).`
          );
          return;
        }
      }
    }

    // Threshold: decimals allowed, no total cap here.
    patchCfg(ct, { [field]: n });
    clearDraft(ct, field);
  }

  function onDecimalKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    ct: ClassType,
    field: DraftField
  ) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      commitNumericField(ct, field);
    }
    if (e.key === "Escape") {
      e.currentTarget.blur();
      clearDraft(ct, field);
    }
  }

  // LOCKED LAYOUT: no structure changes below, only decimal + caps support.
  return (
    <div className="grid grid-cols-[260px_60px_210px_210px_210px_1fr] gap-0 border-t">
      {/* KPI / Custom label */}
      <div className="p-2 border-r">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {raw} · {direction === "LOWER_BETTER" ? "lower better" : "higher better"}
        </div>

        <input
          className="mt-2 w-full rounded-md border px-2 py-1 text-sm"
          value={def?.customer_label ?? ""}
          onChange={(e) => patchKpiDefCustomerLabel(e.target.value)}
          placeholder="Customer label"
        />
      </div>

      {/* P / S / T toggles (stacked) */}
      <div className="p-2 border-r">
        <div className="flex flex-col gap-2 items-start text-xs">
          {CLASSES.map((ct) => {
            const enabled = !!safeCfg(state, ct, kpiKey)?.enabled;
            const tag = ct === "P4P" ? "P" : ct === "SMART" ? "S" : "T";
            return (
              <label key={ct} className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => toggleClassEnabled(ct, e.target.checked)}
                />
                <span className="text-muted-foreground">{tag}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Per-class W+T blocks */}
      {CLASSES.map((ct) => {
        const cfg = safeCfg(state, ct, kpiKey);
        const enabled = !!cfg?.enabled;

        const weightErr = errors[draftKey(ct, "weight_percent")];
        const threshErr = errors[draftKey(ct, "threshold")];
        const gradeErr = errors[draftKey(ct, "grade_value")];

        // Running totals (enabled KPIs only)
        const weightTotal = sumEnabledNumericField(state, ct, "weight_percent");
        const gradeTotal = sumEnabledNumericField(state, ct, "grade_value");

        return (
          <div key={ct} className="p-2 border-r">
            <div className="text-xs font-medium">{ct}</div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                className="w-full rounded-md border px-2 py-1 text-sm"
                inputMode="decimal"
                value={getFieldDisplayValue(ct, "weight_percent")}
                onChange={(e) => setDraft(ct, "weight_percent", e.target.value)}
                onBlur={() => commitNumericField(ct, "weight_percent")}
                onKeyDown={(e) => onDecimalKeyDown(e, ct, "weight_percent")}
                placeholder="W"
                disabled={!enabled}
                title={
                  weightErr ??
                  `Weight percent (decimals supported). Total: ${weightTotal.toFixed(
                    4
                  )} / ${WEIGHT_CAP}`
                }
                aria-invalid={!!weightErr}
              />

              <input
                className="w-full rounded-md border px-2 py-1 text-sm"
                inputMode="decimal"
                value={getFieldDisplayValue(ct, "threshold")}
                onChange={(e) => setDraft(ct, "threshold", e.target.value)}
                onBlur={() => commitNumericField(ct, "threshold")}
                onKeyDown={(e) => onDecimalKeyDown(e, ct, "threshold")}
                placeholder="T"
                disabled={!enabled}
                title={threshErr ?? "Threshold (decimals supported)"}
                aria-invalid={!!threshErr}
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Grade</span>
              <input
                className="w-20 rounded-md border px-2 py-1 text-sm"
                inputMode="decimal"
                value={getFieldDisplayValue(ct, "grade_value")}
                onChange={(e) => setDraft(ct, "grade_value", e.target.value)}
                onBlur={() => commitNumericField(ct, "grade_value")}
                onKeyDown={(e) => onDecimalKeyDown(e, ct, "grade_value")}
                placeholder="10"
                disabled={!enabled}
                title={
                  gradeErr ??
                  `Points for this KPI (decimals supported). Total: ${gradeTotal.toFixed(
                    4
                  )} / ${GRADE_CAP}`
                }
                aria-invalid={!!gradeErr}
              />
            </div>

            <div className="mt-2">
              <button
                type="button"
                className="w-full px-2 py-1 rounded-md text-xs border hover:bg-muted disabled:opacity-50"
                onClick={() => {
                  const threshold = Number(cfg?.threshold);
                  if (!enabled || !Number.isFinite(threshold)) return;

                  const computed = computeRubricDefaults({
                    def: {
                      min_value: def?.min_value ?? null,
                      max_value: def?.max_value ?? null,
                      unit: def?.unit ?? null,
                      direction: def?.direction ?? direction,
                    },
                    threshold,
                    grade_value: cfg?.grade_value ?? null,
                  });

                  setRubricForClass(ct, computed);
                }}
                disabled={!enabled || !Number.isFinite(Number(cfg?.threshold))}
                title="Load defaults for this class only"
              >
                Load
              </button>
            </div>
          </div>
        );
      })}

      {/* Rubric spill (per class) */}
      <div className="p-2 border-r">
        <div className="grid grid-cols-[160px_1fr_1fr_1fr] gap-2 text-[11px] font-medium pb-2 border-b">
          <div>Band</div>
          <div className="text-center">P4P (Min/Max/Score)</div>
          <div className="text-center">SMART (Min/Max/Score)</div>
          <div className="text-center">TECH (Min/Max/Score)</div>
        </div>

        <div className="space-y-2 pt-2 text-[11px]">
          {BANDS.map((bandKey: string) => {
            const noData = bandKey === "NO_DATA";

            return (
              <div
                key={bandKey}
                className="grid grid-cols-[160px_1fr_1fr_1fr] gap-2 items-start"
              >
                <div className="pt-1">{bandKey}</div>

                <RubricInputs
                  classType="P4P"
                  bandKey={bandKey}
                  kpiKey={kpiKey}
                  state={state}
                  enabled={!!safeCfg(state, "P4P", kpiKey)?.enabled}
                  noData={noData}
                  onPatch={patchRubric}
                />

                <RubricInputs
                  classType="SMART"
                  bandKey={bandKey}
                  kpiKey={kpiKey}
                  state={state}
                  enabled={!!safeCfg(state, "SMART", kpiKey)?.enabled}
                  noData={noData}
                  onPatch={patchRubric}
                />

                <RubricInputs
                  classType="TECH"
                  bandKey={bandKey}
                  kpiKey={kpiKey}
                  state={state}
                  enabled={!!safeCfg(state, "TECH", kpiKey)?.enabled}
                  noData={noData}
                  onPatch={patchRubric}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RubricInputs(props: {
  classType: "P4P" | "SMART" | "TECH";
  bandKey: string;
  kpiKey: string;
  state: GridState;
  enabled: boolean;
  noData: boolean;
  onPatch: (
    classType: ClassType,
    bandKey: string,
    patch: Record<string, unknown>
  ) => void;
}) {
  const r =
    safeRubric(props.state, props.classType, props.kpiKey)?.[props.bandKey] ?? {};

  const disabledMinMax = !props.enabled || props.noData;
  const disabledScore = !props.enabled;

  const [draft, setDraft] = React.useState<{
    min: string;
    max: string;
    score: string;
  }>({ min: "", max: "", score: "" });

  // If the backing numeric values change (load defaults, revert, etc),
  // clear drafts so the UI reflects the saved state.
  React.useEffect(() => {
    setDraft({ min: "", max: "", score: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.classType, props.bandKey, props.kpiKey, r?.min_value, r?.max_value, r?.score_value]);

  function getVal(kind: "min" | "max" | "score"): string {
    const v = draft[kind];
    if (v !== "") return v;

    const backing =
      kind === "min" ? r.min_value : kind === "max" ? r.max_value : r.score_value;

    return backing ?? "";
  }

  function setVal(kind: "min" | "max" | "score", v: string) {
    if (!isDraftNumberish(v) && v.trim() !== "") return;
    setDraft((d) => ({ ...d, [kind]: v }));
  }

  function commit(kind: "min" | "max" | "score") {
    const current = draft[kind];
    if (current === "") return; // nothing pending
    const n = toFiniteNumberOrNull(current);

    // Empty clears.
    if (n === null) {
      props.onPatch(props.classType, props.bandKey, {
        [kind === "min" ? "min_value" : kind === "max" ? "max_value" : "score_value"]:
          null,
      });
      setDraft((d) => ({ ...d, [kind]: "" }));
      return;
    }

    // No extra caps here; allow decimals. Min/max are disabled for NO_DATA already.
    props.onPatch(props.classType, props.bandKey, {
      [kind === "min" ? "min_value" : kind === "max" ? "max_value" : "score_value"]:
        n,
    });
    setDraft((d) => ({ ...d, [kind]: "" }));
  }

  function onKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    kind: "min" | "max" | "score"
  ) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      commit(kind);
    }
    if (e.key === "Escape") {
      e.currentTarget.blur();
      setDraft((d) => ({ ...d, [kind]: "" }));
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <input
        className="rounded-md border px-2 py-1 text-[11px] leading-4"
        inputMode="decimal"
        value={getVal("min")}
        onChange={(e) => setVal("min", e.target.value)}
        onBlur={() => commit("min")}
        onKeyDown={(e) => onKeyDown(e, "min")}
        placeholder={props.noData ? "-" : "min"}
        disabled={disabledMinMax}
      />

      <input
        className="rounded-md border px-2 py-1 text-[11px] leading-4"
        inputMode="decimal"
        value={getVal("max")}
        onChange={(e) => setVal("max", e.target.value)}
        onBlur={() => commit("max")}
        onKeyDown={(e) => onKeyDown(e, "max")}
        placeholder={props.noData ? "-" : "max"}
        disabled={disabledMinMax}
      />

      <input
        className="rounded-md border px-2 py-1 text-[11px] leading-4"
        inputMode="decimal"
        value={getVal("score")}
        onChange={(e) => setVal("score", e.target.value)}
        onBlur={() => commit("score")}
        onKeyDown={(e) => onKeyDown(e, "score")}
        placeholder="score"
        disabled={disabledScore}
      />
    </div>
  );
}