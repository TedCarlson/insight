// apps/web/src/features/metrics-admin/components/MetricsConsoleRow.tsx
"use client";

import * as React from "react";
import type { GridState } from "@/features/metrics-admin/lib/gridShape";
import { BANDS, parseNum } from "@/features/metrics-admin/lib/gridUtils";
import { computeRubricDefaults } from "@/features/metrics-admin/lib/spillDefaults";

type ClassType = "P4P" | "SMART" | "TECH";

type Props = {
  kpiKey: string;
  state: GridState;
  setState: React.Dispatch<React.SetStateAction<GridState>>;
};

const CLASSES: ClassType[] = ["P4P", "SMART", "TECH"];

function safeCfg(state: GridState, classType: ClassType, kpiKey: string) {
  return state.classConfigByClass?.[classType]?.[kpiKey] ?? {};
}

function safeRubric(state: GridState, classType: ClassType, kpiKey: string) {
  return state.rubricByClass?.[classType]?.[kpiKey] ?? {};
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function MetricsConsoleRow({ kpiKey, state, setState }: Props) {
  const def = state.kpiDefsByKey?.[kpiKey];
  const label = def?.customer_label ?? def?.label ?? def?.kpi_key ?? kpiKey;
  const raw = def?.kpi_key ?? kpiKey;
  const direction: "HIGHER_BETTER" | "LOWER_BETTER" =
    def?.direction ?? "HIGHER_BETTER";

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

  // LOCKED LAYOUT: no structure changes below, only grade decimal support.
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

        return (
          <div key={ct} className="p-2 border-r">
            <div className="text-xs font-medium">{ct}</div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                className="w-full rounded-md border px-2 py-1 text-sm"
                inputMode="decimal"
                value={cfg?.weight_percent ?? ""}
                onChange={(e) =>
                  patchCfg(ct, { weight_percent: parseNum(e.target.value) })
                }
                placeholder="W"
                disabled={!enabled}
                title="Weight percent (enter 35 for 35%)"
              />

              <input
                className="w-full rounded-md border px-2 py-1 text-sm"
                inputMode="decimal"
                value={cfg?.threshold ?? ""}
                onChange={(e) => patchCfg(ct, { threshold: parseNum(e.target.value) })}
                placeholder="T"
                disabled={!enabled}
                title="Threshold (decimals supported)"
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Grade</span>
              <input
                className="w-20 rounded-md border px-2 py-1 text-sm"
                inputMode="decimal"
                value={cfg?.grade_value ?? ""}
                onChange={(e) => {
                  const rawVal = e.target.value;

                  // Allow empty -> null (lets you clear field)
                  if (rawVal.trim() === "") {
                    patchCfg(ct, { grade_value: null });
                    return;
                  }

                  const n = Number(rawVal);
                  if (!Number.isFinite(n)) return;

                  // Allow decimals (ex: 0.5). Normalize to 2 decimals to avoid float drift.
                  const normalized = round2(n);

                  // Keep existing loose clamp behavior (0..1000) without blocking decimals
                  if (normalized < 0 || normalized > 1000) return;

                  patchCfg(ct, { grade_value: normalized });
                }}
                placeholder="10"
                disabled={!enabled}
                title="Points available for this KPI (decimals supported: 0.5, 1.25, etc.)"
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
  onPatch: (classType: ClassType, bandKey: string, patch: Record<string, unknown>) => void;
}) {
  const r = safeRubric(props.state, props.classType, props.kpiKey)?.[props.bandKey] ?? {};

  const disabledMinMax = !props.enabled || props.noData;
  const disabledScore = !props.enabled;

  return (
    <div className="grid grid-cols-3 gap-2">
      <input
        className="rounded-md border px-2 py-1 text-[11px] leading-4"
        inputMode="decimal"
        value={r.min_value ?? ""}
        onChange={(e) =>
          props.onPatch(props.classType, props.bandKey, { min_value: parseNum(e.target.value) })
        }
        placeholder={props.noData ? "-" : "min"}
        disabled={disabledMinMax}
      />

      <input
        className="rounded-md border px-2 py-1 text-[11px] leading-4"
        inputMode="decimal"
        value={r.max_value ?? ""}
        onChange={(e) =>
          props.onPatch(props.classType, props.bandKey, { max_value: parseNum(e.target.value) })
        }
        placeholder={props.noData ? "-" : "max"}
        disabled={disabledMinMax}
      />

      <input
        className="rounded-md border px-2 py-1 text-[11px] leading-4"
        inputMode="decimal"
        value={r.score_value ?? ""}
        onChange={(e) =>
          props.onPatch(props.classType, props.bandKey, { score_value: parseNum(e.target.value) })
        }
        placeholder="score"
        disabled={disabledScore}
      />
    </div>
  );
}