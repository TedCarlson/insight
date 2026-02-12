// apps/web/src/features/metrics-admin/components/MetricsConsoleGrid.tsx
"use client";

import * as React from "react";
import MetricsConsoleRow from "@/features/metrics-admin/components/MetricsConsoleRow";
import MetricsColorsDrawer from "@/features/metrics-admin/components/MetricsColorsDrawer";

type InitialPayload = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

type Props = {
  initial: InitialPayload;
  msoId: string | null;
};

type ClassType = "P4P" | "SMART" | "TECH";

type GridState = {
  kpiDefsByKey: Record<string, any>;
  classConfigByClass: Record<ClassType, Record<string, any>>;
  rubricByClass: Record<ClassType, Record<string, Record<string, any>>>;
};

type Snapshot = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

function buildStateFromInitial(initial: InitialPayload): GridState {
  const kpiDefsByKey: Record<string, any> = {};
  for (const d of initial.kpiDefs ?? []) {
    const key = String(d?.kpi_key ?? "").trim();
    if (!key) continue;
    kpiDefsByKey[key] = d;
  }

  const classConfigByClass: Record<ClassType, Record<string, any>> = {
    P4P: {},
    SMART: {},
    TECH: {},
  };

  for (const row of initial.classConfig ?? []) {
    const ct = String(row?.class_type ?? "").toUpperCase() as ClassType;
    const k = String(row?.kpi_key ?? "").trim();
    if (!k) continue;
    if (ct !== "P4P" && ct !== "SMART" && ct !== "TECH") continue;
    classConfigByClass[ct][k] = row;
  }

  const rubricByClass: Record<ClassType, Record<string, Record<string, any>>> = {
    P4P: {},
    SMART: {},
    TECH: {},
  };

  for (const r of initial.rubricRows ?? []) {
    const ct = String(r?.class_type ?? "").toUpperCase() as ClassType;
    const k = String(r?.kpi_key ?? "").trim();
    const band = String(r?.band_key ?? "").trim();
    if (!k || !band) continue;
    if (ct !== "P4P" && ct !== "SMART" && ct !== "TECH") continue;

    rubricByClass[ct][k] = rubricByClass[ct][k] ?? {};
    rubricByClass[ct][k][band] = r;
  }

  return {
    kpiDefsByKey,
    classConfigByClass,
    rubricByClass,
  };
}

function snapshotFromPayload(payload: InitialPayload): Snapshot {
  return {
    kpiDefs: Array.isArray(payload.kpiDefs) ? payload.kpiDefs : [],
    classConfig: Array.isArray(payload.classConfig) ? payload.classConfig : [],
    rubricRows: Array.isArray(payload.rubricRows) ? payload.rubricRows : [],
  };
}

function safeKey(s: unknown) {
  return String(s ?? "").trim();
}

function stableStringify(v: any) {
  // We want null to be preserved and compared as a real value.
  // undefined should not appear in persisted fields; if it does, treat it as a distinct sentinel.
  const replacer = (_k: string, val: any) => (val === undefined ? "__UNDEF__" : val);
  try {
    return JSON.stringify(v, replacer);
  } catch {
    return String(v);
  }
}

function pick<T extends Record<string, any>>(obj: T, keys: string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) out[k] = obj?.[k];
  return out;
}

function keyOfKpiDef(r: any) {
  return safeKey(r?.kpi_key);
}
function keyOfClassCfg(r: any) {
  return `${safeKey(r?.class_type)}|${safeKey(r?.kpi_key)}`;
}
function keyOfRubric(r: any) {
  return `${safeKey(r?.class_type)}|${safeKey(r?.kpi_key)}|${safeKey(r?.band_key)}`;
}

function indexBy<T>(rows: T[], keyFn: (r: T) => string) {
  const m = new Map<string, T>();
  for (const r of rows ?? []) {
    const k = keyFn(r);
    if (!k) continue;
    m.set(k, r);
  }
  return m;
}

function flattenStateToPayload(state: GridState): Snapshot {
  // KPI defs
  const kpiDefs: any[] = Object.keys(state.kpiDefsByKey ?? {})
    .sort()
    .map((k) => state.kpiDefsByKey[k])
    .filter(Boolean);

  // class config
  const classConfig: any[] = [];
  (["P4P", "SMART", "TECH"] as ClassType[]).forEach((ct) => {
    const cfgByKpi = state.classConfigByClass?.[ct] ?? {};
    Object.keys(cfgByKpi).forEach((kpiKey) => {
      const row = cfgByKpi[kpiKey];
      if (!row) return;
      classConfig.push(row);
    });
  });

  // rubric rows
  const rubricRows: any[] = [];
  (["P4P", "SMART", "TECH"] as ClassType[]).forEach((ct) => {
    const byKpi = state.rubricByClass?.[ct] ?? {};
    Object.keys(byKpi).forEach((kpiKey) => {
      const byBand = byKpi[kpiKey] ?? {};
      Object.keys(byBand).forEach((bandKey) => {
        const row = byBand[bandKey];
        if (!row) return;
        rubricRows.push(row);
      });
    });
  });

  return { kpiDefs, classConfig, rubricRows };
}

function buildDiff(current: Snapshot, baseline: Snapshot) {
  // IMPORTANT:
  // - If a user clears a field, UI should store null. We must treat that as a change and include it.
  // - We only send fields the API expects (avoid "unknown column" issues).

  const kpiFields = ["kpi_key", "label", "customer_label"];
  const cfgFields = ["class_type", "kpi_key", "enabled", "weight_percent", "threshold", "grade_value"];
  const rubFields = ["class_type", "kpi_key", "band_key", "min_value", "max_value", "score_value", "color_hex"];

  const baseKpi = indexBy(baseline.kpiDefs, keyOfKpiDef);
  const baseCfg = indexBy(baseline.classConfig, keyOfClassCfg);
  const baseRub = indexBy(baseline.rubricRows, keyOfRubric);

  const kpiDefsChanged: any[] = [];
  for (const row of current.kpiDefs ?? []) {
    const key = keyOfKpiDef(row);
    if (!key) continue;

    const cur = pick(row, kpiFields);
    const prev = pick(baseKpi.get(key) as any, kpiFields);

    if (stableStringify(cur) !== stableStringify(prev)) {
      // allow null to flow through
      kpiDefsChanged.push(cur);
    }
  }

  const classConfigChanged: any[] = [];
  for (const row of current.classConfig ?? []) {
    const key = keyOfClassCfg(row);
    if (!key) continue;

    const cur = pick(row, cfgFields);
    const prev = pick(baseCfg.get(key) as any, cfgFields);

    if (stableStringify(cur) !== stableStringify(prev)) {
      classConfigChanged.push(cur);
    }
  }

  const rubricRowsChanged: any[] = [];
  for (const row of current.rubricRows ?? []) {
    const key = keyOfRubric(row);
    if (!key) continue;

    const cur = pick(row, rubFields);
    const prev = pick(baseRub.get(key) as any, rubFields);

    if (stableStringify(cur) !== stableStringify(prev)) {
      rubricRowsChanged.push(cur);
    }
  }

  return {
    kpiDefs: kpiDefsChanged,
    classConfig: classConfigChanged,
    rubricRows: rubricRowsChanged,
  };
}

export default function MetricsConsoleGrid({ initial, msoId }: Props) {
  const [state, setState] = React.useState<GridState>(() => buildStateFromInitial(initial));
  const [colorsOpen, setColorsOpen] = React.useState(false);

  // Baseline snapshot: last loaded OR last saved canonical snapshot.
  const baselineRef = React.useRef<Snapshot>(snapshotFromPayload(initial));

  // Save UX
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveOkAt, setSaveOkAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    setState(buildStateFromInitial(initial));
    baselineRef.current = snapshotFromPayload(initial);
    setSaveError(null);
    setSaveOkAt(null);
  }, [initial]);

  const kpiKeys = React.useMemo(() => {
    return Object.keys(state?.kpiDefsByKey ?? {}).sort();
  }, [state?.kpiDefsByKey]);

  const hasChanges = React.useMemo(() => {
    const current = flattenStateToPayload(state);
    const diff = buildDiff(current, baselineRef.current);
    return diff.kpiDefs.length > 0 || diff.classConfig.length > 0 || diff.rubricRows.length > 0;
  }, [state]);

  async function handleSave() {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveOkAt(null);

      const current = flattenStateToPayload(state);
      const diff = buildDiff(current, baselineRef.current);

      // No-op if unchanged
      if (diff.kpiDefs.length === 0 && diff.classConfig.length === 0 && diff.rubricRows.length === 0) {
        setSaveOkAt(Date.now());
        return;
      }

      const res = await fetch("/api/admin/metrics-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "SAVE_GRID",
          payload: diff,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const msg = j?.error ? String(j.error) : "Save failed";
        const detail = j?.detail ? ` — ${String(j.detail)}` : "";
        throw new Error(`${msg}${detail}`);
      }

      const snap = (await res.json().catch(() => null)) as Snapshot | null;
      if (!snap || !Array.isArray(snap.kpiDefs) || !Array.isArray(snap.classConfig) || !Array.isArray(snap.rubricRows)) {
        throw new Error("Save succeeded but response payload was invalid");
      }

      // Canonical rehydrate (verification) + reset baseline
      const nextInitial: InitialPayload = {
        kpiDefs: snap.kpiDefs ?? [],
        classConfig: snap.classConfig ?? [],
        rubricRows: snap.rubricRows ?? [],
      };

      setState(buildStateFromInitial(nextInitial));
      baselineRef.current = snapshotFromPayload(nextInitial);
      setSaveOkAt(Date.now());
    } catch (e: any) {
      setSaveError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Legend: <span className="font-medium text-foreground">P</span>=P4P,{" "}
          <span className="font-medium text-foreground">S</span>=SMART,{" "}
          <span className="font-medium text-foreground">T</span>=Tech Scorecard
        </div>

        <div className="flex items-center gap-2">
          {saveError ? (
            <div className="text-xs text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded-md">
              {saveError}
            </div>
          ) : saveOkAt ? (
            <div className="text-xs text-emerald-700 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded-md">
              Saved
            </div>
          ) : null}

          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm border hover:bg-muted disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            title={!hasChanges ? "No changes to save" : "Save changes (writes only changed rows; null clears are persisted)"}
          >
            {saving ? "Saving…" : "Save"}
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm border hover:bg-muted"
            onClick={() => setColorsOpen(true)}
            title="Manage band colors"
          >
            Colors
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-background overflow-hidden">
        {/* Header (LOCKED LAYOUT) */}
        <div className="grid grid-cols-[260px_60px_210px_210px_210px_1fr] gap-0 bg-muted/30 border-b">
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">
            KPI / Custom label
          </div>

          <div className="p-2 border-r text-xs font-medium text-muted-foreground leading-tight">
            <div>P</div>
            <div>S</div>
            <div>T</div>
          </div>

          <div className="p-2 border-r text-xs font-medium text-muted-foreground">P4P (W+T)</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">SMART (W+T)</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">TECH (W+T)</div>

          <div className="p-2 border-r text-xs font-medium text-muted-foreground">
            Rubric Spill (per class)
          </div>
        </div>

        {/* Rows */}
        <div>
          {kpiKeys.map((kpiKey) => (
            <MetricsConsoleRow
              key={kpiKey}
              kpiKey={kpiKey}
              state={state as any}
              setState={setState as any}
            />
          ))}
        </div>
      </div>

      <MetricsColorsDrawer open={colorsOpen} onOpenChange={setColorsOpen} />
    </section>
  );
}