"use client";

// apps/web/src/features/metrics-admin/components/MetricsConsoleGrid.tsx
import * as React from "react";
import MetricsConsoleRow from "@/features/metrics-admin/components/MetricsConsoleRow";
import MetricsColorsDrawer from "@/features/metrics-admin/components/MetricsColorsDrawer";

type ClassType = "P4P" | "SMART" | "TECH";
type BandKey = "EXCEEDS" | "MEETS" | "NEEDS_IMPROVEMENT" | "MISSES" | "NO_DATA";

type InitialPayload = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

type Props = {
  initial: InitialPayload;
};

type Snapshot = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

type GridState = {
  kpiOrder: string[];
  kpiDefsByKey: Record<string, any>;
  classConfigByClass: Record<ClassType, Record<string, any>>;
  rubricByClass: Record<ClassType, Record<string, Record<string, any>>>;
};

const CLASSES: ClassType[] = ["P4P", "SMART", "TECH"];
const BANDS: BandKey[] = ["EXCEEDS", "MEETS", "NEEDS_IMPROVEMENT", "MISSES", "NO_DATA"];

function str(v: unknown) {
  return String(v ?? "").trim();
}

function safeKey(v: unknown) {
  return str(v).toLowerCase();
}

function upper(v: unknown) {
  return str(v).toUpperCase();
}

function numOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeClassConfigRow(r: any) {
  const out = { ...(r ?? {}) };
  // Back-compat: some DB rows may be threshold_value/weight.
  if (out.threshold === undefined && out.threshold_value !== undefined) out.threshold = out.threshold_value;
  if (out.weight_percent === undefined && out.weight !== undefined) out.weight_percent = out.weight;
  return out;
}

function buildStateFromInitial(initial: InitialPayload): GridState {
  const kpiDefsByKey: Record<string, any> = {};
  const kpiOrder: string[] = [];

  for (const d of initial.kpiDefs ?? []) {
    const k = str(d?.kpi_key);
    if (!k) continue;
    if (!kpiDefsByKey[k]) kpiOrder.push(k);
    kpiDefsByKey[k] = d;
  }

  const classConfigByClass: any = { P4P: {}, SMART: {}, TECH: {} };
  for (const r of initial.classConfig ?? []) {
    const ct = upper(r?.class_type) as ClassType;
    const k = str(r?.kpi_key);
    if (!ct || !k) continue;
    if (!classConfigByClass[ct]) classConfigByClass[ct] = {};
    classConfigByClass[ct][k] = normalizeClassConfigRow(r);
  }

  const rubricByClass: any = { P4P: {}, SMART: {}, TECH: {} };
  // Normalize rubric rows into class->kpi->band
  for (const r of initial.rubricRows ?? []) {
    const cls = upper(r?.class_type) as ClassType;
    const k = str(r?.kpi_key);
    const b = upper(r?.band_key) as BandKey;
    if (!cls || !k || !b) continue;
    if (!rubricByClass[cls]) rubricByClass[cls] = {};
    if (!rubricByClass[cls][k]) rubricByClass[cls][k] = {};
    rubricByClass[cls][k][b] = r;
  }

  // Ensure rubric shells exist for each KPI/band so editors always render stable rows
  for (const cls of CLASSES) {
    for (const k of kpiOrder) {
      if (!rubricByClass[cls][k]) rubricByClass[cls][k] = {};
      for (const band of BANDS) {
        if (!rubricByClass[cls][k][band]) {
          rubricByClass[cls][k][band] = {
            class_type: cls,
            kpi_key: k,
            band_key: band,
            min_value: null,
            max_value: null,
            score_value: null,
            color_hex: null,
          };
        }
      }
    }
  }

  return { kpiOrder, kpiDefsByKey, classConfigByClass, rubricByClass };
}

function snapshotFromPayload(p: InitialPayload): Snapshot {
  return {
    kpiDefs: Array.isArray(p?.kpiDefs) ? p.kpiDefs : [],
    classConfig: Array.isArray(p?.classConfig) ? p.classConfig.map(normalizeClassConfigRow) : [],
    rubricRows: Array.isArray(p?.rubricRows) ? p.rubricRows : [],
  };
}

function flattenStateToPayload(state: GridState): Snapshot {
  const kpiDefs = Object.values(state.kpiDefsByKey ?? {});
  const classConfig: any[] = [];

  for (const cls of CLASSES) {
    const byKpi = state.classConfigByClass?.[cls] ?? {};
    for (const k of Object.keys(byKpi)) {
      classConfig.push({
        ...byKpi[k],
        class_type: cls,
        kpi_key: k,
      });
    }
  }

  const rubricRows: any[] = [];
  for (const cls of CLASSES) {
    const byKpi = state.rubricByClass?.[cls] ?? {};
    for (const k of Object.keys(byKpi)) {
      const byBand = byKpi[k] ?? {};
      for (const band of Object.keys(byBand)) {
        const row = byBand[band];
        rubricRows.push({
          ...row,
          class_type: cls,
          kpi_key: k,
          band_key: band,
        });
      }
    }
  }

  return { kpiDefs, classConfig, rubricRows };
}

function indexBy<T extends Record<string, any>>(rows: T[], keyFn: (r: T) => string) {
  const m = new Map<string, T>();
  for (const r of rows ?? []) m.set(keyFn(r), r);
  return m;
}

function keyOfKpiDef(r: any) {
  return safeKey(r?.kpi_key);
}
function keyOfCfg(r: any) {
  return `${safeKey(r?.class_type)}|${safeKey(r?.kpi_key)}`;
}
function keyOfRubric(r: any) {
  return `${safeKey(r?.class_type)}|${safeKey(r?.kpi_key)}|${safeKey(r?.band_key)}`;
}

function shallowPick(obj: any, fields: string[]) {
  const out: any = {};
  for (const f of fields) out[f] = obj?.[f] ?? null;
  return out;
}

// Build a minimal diff payload: only changed rows, including null-clears.
function buildDiff(current: Snapshot, baseline: Snapshot): Snapshot {
  const cfgFields = ["class_type", "kpi_key", "enabled", "weight_percent", "threshold", "threshold_value", "weight", "grade_value"];
  const rubFields = ["class_type", "kpi_key", "band_key", "min_value", "max_value", "score_value", "color_hex"];
  const defFields = ["kpi_key", "label", "customer_label", "direction", "unit", "min_value", "max_value", "raw_label_identifier", "no_data_behavior"];

  const baseDef = indexBy(baseline.kpiDefs ?? [], keyOfKpiDef);
  const baseCfg = indexBy(baseline.classConfig ?? [], keyOfCfg);
  const baseRub = indexBy(baseline.rubricRows ?? [], keyOfRubric);

  const kpiDefsChanged: any[] = [];
  for (const row of current.kpiDefs ?? []) {
    const k = keyOfKpiDef(row);
    if (!k) continue;
    const cur = shallowPick(row, defFields);
    const prev = baseDef.get(k);
    const prevPick = prev ? shallowPick(prev, defFields) : null;
    if (!prevPick || JSON.stringify(cur) !== JSON.stringify(prevPick)) kpiDefsChanged.push(cur);
  }

  const classConfigChanged: any[] = [];
  for (const row of current.classConfig ?? []) {
    const k = keyOfCfg(row);
    if (!k) continue;
    const cur = shallowPick(row, cfgFields);
    const prev = baseCfg.get(k);
    const prevPick = prev ? shallowPick(prev, cfgFields) : null;
    if (!prevPick || JSON.stringify(cur) !== JSON.stringify(prevPick)) classConfigChanged.push(cur);
  }

  const rubricRowsChanged: any[] = [];
  for (const row of current.rubricRows ?? []) {
    const k = keyOfRubric(row);
    if (!k) continue;
    const cur = shallowPick(row, rubFields);
    const prev = baseRub.get(k);
    const prevPick = prev ? shallowPick(prev, rubFields) : null;
    if (!prevPick || JSON.stringify(cur) !== JSON.stringify(prevPick)) rubricRowsChanged.push(cur);
  }

  return { kpiDefs: kpiDefsChanged, classConfig: classConfigChanged, rubricRows: rubricRowsChanged };
}

export default function MetricsConsoleGrid({ initial }: Props) {
  const [state, setState] = React.useState<GridState>(() => buildStateFromInitial(initial));
  const [colorsOpen, setColorsOpen] = React.useState(false);

  const baselineRef = React.useRef<Snapshot>(snapshotFromPayload(initial));

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveOkAt, setSaveOkAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    setState(buildStateFromInitial(initial));
    baselineRef.current = snapshotFromPayload(initial);
    setSaveError(null);
    setSaveOkAt(null);
  }, [initial]);

  const kpiKeys = React.useMemo(() => Object.keys(state?.kpiDefsByKey ?? {}).sort(), [state?.kpiDefsByKey]);

  const hasChanges = React.useMemo(() => {
    const current = flattenStateToPayload(state);
    const diff = buildDiff(current, baselineRef.current);
    return diff.kpiDefs.length > 0 || diff.classConfig.length > 0 || diff.rubricRows.length > 0;
  }, [state]);

  function handleRevert() {
    const base = baselineRef.current;
    const nextInitial: InitialPayload = {
      kpiDefs: Array.isArray(base?.kpiDefs) ? base.kpiDefs : [],
      classConfig: Array.isArray(base?.classConfig) ? base.classConfig : [],
      rubricRows: Array.isArray(base?.rubricRows) ? base.rubricRows : [],
    };

    setState(buildStateFromInitial(nextInitial));
    setSaveError(null);
    setSaveOkAt(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveOkAt(null);

      const current = flattenStateToPayload(state);
      const diff = buildDiff(current, baselineRef.current);

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

      const snap = (await res.json().catch(() => null)) as any;

      if (!snap || !Array.isArray(snap.kpiDefs) || !Array.isArray(snap.classConfig) || !Array.isArray(snap.rubricRows)) {
        throw new Error("Save succeeded but response payload was invalid");
      }

      const nextInitial: InitialPayload = {
        kpiDefs: snap.kpiDefs ?? [],
        classConfig: (snap.classConfig ?? []).map(normalizeClassConfigRow),
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

  const canCommit = hasChanges && !saving;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Legend: <span className="font-medium text-foreground">P</span>=P4P,{" "}
          <span className="font-medium text-foreground">S</span>=SMART,{" "}
          <span className="font-medium text-foreground">T</span>=Tech Scorecard
        </div>

        <div className="flex items-center gap-2">
          {hasChanges ? (
            <div
              className="text-xs text-amber-800 border border-amber-200 bg-amber-50 px-2 py-1 rounded-md"
              title="You have edits that are not yet persisted. Use Commit to lock them in."
            >
              Unsaved changes
            </div>
          ) : null}

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
            className="px-3 py-1.5 rounded-md text-sm bg-primary text-white disabled:opacity-50"
            onClick={handleSave}
            disabled={!canCommit}
            title={
              !hasChanges
                ? "No changes to commit"
                : "Commit changes (writes only changed rows; null clears are persisted). Response rehydrates the grid to verify canonical DB state."
            }
          >
            {saving ? "Committing…" : "Commit"}
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm border hover:bg-muted disabled:opacity-50"
            onClick={handleRevert}
            disabled={saving || !hasChanges}
            title={!hasChanges ? "Nothing to revert" : "Revert unsaved edits back to the last loaded/saved state"}
          >
            Revert
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm border hover:bg-muted"
            onClick={() => setColorsOpen(true)}
            disabled={saving}
            title="Manage band colors"
          >
            Colors
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-background overflow-hidden">
        <div className="grid grid-cols-[260px_60px_210px_210px_210px_1fr] gap-0 bg-muted/30 border-b">
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">KPI / Custom label</div>

          <div className="p-2 border-r text-xs font-medium text-muted-foreground leading-tight">
            <div>P</div>
            <div>S</div>
            <div>T</div>
          </div>

          <div className="p-2 border-r text-xs font-medium text-muted-foreground">P4P (W+T)</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">SMART (W+T)</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">TECH (W+T)</div>

          <div className="p-2 border-r text-xs font-medium text-muted-foreground">Rubric Spill (per class)</div>
        </div>

        <div>
          {kpiKeys.map((k) => (
            <MetricsConsoleRow key={k} kpiKey={k} state={state as any} setState={setState as any} />
          ))}
        </div>
      </div>

      <MetricsColorsDrawer open={colorsOpen} onOpenChange={setColorsOpen} />
    </section>
  );
}