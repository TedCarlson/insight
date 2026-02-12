"use client";

import * as React from "react";
import MetricsConsoleRow from "@/features/metrics-admin/components/MetricsConsoleRow";
import MetricsColorsDrawer from "@/features/metrics-admin/components/MetricsColorsDrawer";

type InitialPayload = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

type MsoOption = {
  mso_id: string;
  mso_name: string | null;
  mso_lob: string | null;
};

type Props = {
  initial: InitialPayload;
  initialMsoId: string | null;
  msoOptions: MsoOption[];
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

function shortId(id: string) {
  const s = String(id ?? "");
  if (s.length <= 8) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function normalizeClassConfigRow(row: any) {
  const out = { ...(row ?? {}) };
  if (out.weight_percent === undefined && out.weight !== undefined) out.weight_percent = out.weight;
  if (out.threshold === undefined && out.threshold_value !== undefined) out.threshold = out.threshold_value;
  return out;
}

function normalizeInitial(initial: InitialPayload): InitialPayload {
  return {
    kpiDefs: Array.isArray(initial.kpiDefs) ? initial.kpiDefs : [],
    classConfig: Array.isArray(initial.classConfig) ? initial.classConfig.map(normalizeClassConfigRow) : [],
    rubricRows: Array.isArray(initial.rubricRows) ? initial.rubricRows : [],
  };
}

function buildStateFromInitial(initialRaw: InitialPayload): GridState {
  const initial = normalizeInitial(initialRaw);

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
    classConfigByClass[ct][k] = normalizeClassConfigRow(row);
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

  return { kpiDefsByKey, classConfigByClass, rubricByClass };
}

function snapshotFromPayload(payloadRaw: InitialPayload): Snapshot {
  const payload = normalizeInitial(payloadRaw);
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
  const kpiDefs: any[] = Object.keys(state.kpiDefsByKey ?? {})
    .sort()
    .map((k) => state.kpiDefsByKey[k])
    .filter(Boolean);

  const classConfig: any[] = [];
  (["P4P", "SMART", "TECH"] as ClassType[]).forEach((ct) => {
    const cfgByKpi = state.classConfigByClass?.[ct] ?? {};
    Object.keys(cfgByKpi).forEach((kpiKey) => {
      const row = cfgByKpi[kpiKey];
      if (!row) return;
      classConfig.push(normalizeClassConfigRow(row));
    });
  });

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

function buildDiff(currentRaw: Snapshot, baselineRaw: Snapshot) {
  const current: Snapshot = {
    kpiDefs: currentRaw.kpiDefs ?? [],
    classConfig: (currentRaw.classConfig ?? []).map(normalizeClassConfigRow),
    rubricRows: currentRaw.rubricRows ?? [],
  };
  const baseline: Snapshot = {
    kpiDefs: baselineRaw.kpiDefs ?? [],
    classConfig: (baselineRaw.classConfig ?? []).map(normalizeClassConfigRow),
    rubricRows: baselineRaw.rubricRows ?? [],
  };

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
      kpiDefsChanged.push(cur);
    }
  }

  const classConfigChanged: any[] = [];
  for (const row of current.classConfig ?? []) {
    const key = keyOfClassCfg(row);
    if (!key) continue;

    const cur = pick(normalizeClassConfigRow(row), cfgFields);
    const prev = pick(normalizeClassConfigRow(baseCfg.get(key) as any), cfgFields);

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

  return { kpiDefs: kpiDefsChanged, classConfig: classConfigChanged, rubricRows: rubricRowsChanged };
}

async function fetchSnapshotForMso(msoId: string): Promise<Snapshot> {
  const res = await fetch(`/api/admin/metrics-config?mso_id=${encodeURIComponent(msoId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const j = await res.json().catch(() => null);
    const msg = j?.error ? String(j.error) : "Failed to load snapshot";
    const detail = j?.detail ? ` — ${String(j.detail)}` : "";
    throw new Error(`${msg}${detail}`);
  }

  const snap = (await res.json().catch(() => null)) as Snapshot | null;
  if (!snap || !Array.isArray((snap as any).kpiDefs) || !Array.isArray((snap as any).classConfig) || !Array.isArray((snap as any).rubricRows)) {
    throw new Error("Snapshot response payload was invalid");
  }

  return {
    kpiDefs: (snap as any).kpiDefs ?? [],
    classConfig: ((snap as any).classConfig ?? []).map(normalizeClassConfigRow),
    rubricRows: (snap as any).rubricRows ?? [],
  };
}

export default function MetricsConsoleGrid({ initial, initialMsoId, msoOptions }: Props) {
  const [selectedMsoId, setSelectedMsoId] = React.useState<string | null>(initialMsoId);
  const [state, setState] = React.useState<GridState>(() => buildStateFromInitial(initial));
  const [colorsOpen, setColorsOpen] = React.useState(false);

  const baselineRef = React.useRef<Snapshot>(snapshotFromPayload(initial));

  const [saving, setSaving] = React.useState(false);
  const [loadingMso, setLoadingMso] = React.useState(false);
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

  async function handleSelectMso(next: string | null) {
    if (saving || loadingMso) return;

    if (hasChanges) {
      const ok = window.confirm("You have unsaved changes. Switching MSO will discard them. Continue?");
      if (!ok) return;
    }

    setSaveError(null);
    setSaveOkAt(null);
    setSelectedMsoId(next);

    if (!next) {
      const current = flattenStateToPayload(state);
      const nextInitial: InitialPayload = {
        kpiDefs: current.kpiDefs,
        classConfig: current.classConfig,
        rubricRows: [],
      };
      setState(buildStateFromInitial(nextInitial));
      baselineRef.current = snapshotFromPayload(nextInitial);
      return;
    }

    try {
      setLoadingMso(true);
      const snap = await fetchSnapshotForMso(next);

      const nextInitial: InitialPayload = {
        kpiDefs: snap.kpiDefs ?? [],
        classConfig: snap.classConfig ?? [],
        rubricRows: snap.rubricRows ?? [],
      };

      setState(buildStateFromInitial(nextInitial));
      baselineRef.current = snapshotFromPayload(nextInitial);
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to load MSO snapshot");
    } finally {
      setLoadingMso(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveOkAt(null);

      if (!selectedMsoId) {
        throw new Error("Missing MSO scope. Select an MSO to lock scope.");
      }

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
          mso_id: selectedMsoId,
          payload: {
            ...diff,
            mso_id: selectedMsoId,
          },
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const msg = j?.error ? String(j.error) : "Save failed";
        const detail = j?.detail ? ` — ${String(j.detail)}` : "";
        throw new Error(`${msg}${detail}`);
      }

      const snap = (await res.json().catch(() => null)) as Snapshot | null;
      if (!snap || !Array.isArray((snap as any).kpiDefs) || !Array.isArray((snap as any).classConfig) || !Array.isArray((snap as any).rubricRows)) {
        throw new Error("Save succeeded but response payload was invalid");
      }

      const nextInitial: InitialPayload = {
        kpiDefs: (snap as any).kpiDefs ?? [],
        classConfig: ((snap as any).classConfig ?? []).map(normalizeClassConfigRow),
        rubricRows: (snap as any).rubricRows ?? [],
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

  const canCommit = !!selectedMsoId && hasChanges && !saving && !loadingMso;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Legend: <span className="font-medium text-foreground">P</span>=P4P,{" "}
          <span className="font-medium text-foreground">S</span>=SMART,{" "}
          <span className="font-medium text-foreground">T</span>=Tech Scorecard
        </div>

        <div className="flex items-center gap-2">
          {/* MSO Scope Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">MSO</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={selectedMsoId ?? ""}
              onChange={(e) => handleSelectMso(e.target.value ? e.target.value : null)}
              disabled={saving || loadingMso}
              title="Select MSO to lock rubric scope"
            >
              <option value="">{msoOptions?.length ? "Select MSO…" : "No MSOs found"}</option>
              {(msoOptions ?? []).map((o) => {
                const label = o.mso_name?.trim()
                  ? `${o.mso_name}${o.mso_lob ? ` • ${o.mso_lob}` : ""}`
                  : `MSO • ${shortId(o.mso_id)}`;

                return (
                  <option key={o.mso_id} value={o.mso_id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {hasChanges ? (
            <div
              className="text-xs text-amber-800 border border-amber-200 bg-amber-50 px-2 py-1 rounded-md"
              title="You have edits that are not yet persisted. Use Commit to lock them in."
            >
              Unsaved changes
            </div>
          ) : null}

          {loadingMso ? (
            <div className="text-xs text-slate-700 border border-slate-200 bg-slate-50 px-2 py-1 rounded-md">
              Loading MSO…
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
              !selectedMsoId
                ? "Select an MSO to lock scope"
                : !hasChanges
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
            disabled={saving || loadingMso || !hasChanges}
            title={!hasChanges ? "Nothing to revert" : "Revert unsaved edits back to the last loaded/saved state"}
          >
            Revert
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-md text-sm border hover:bg-muted"
            onClick={() => setColorsOpen(true)}
            disabled={saving || loadingMso}
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