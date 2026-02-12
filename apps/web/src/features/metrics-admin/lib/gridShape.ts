    import { BANDS } from "@/features/metrics-admin/lib/gridUtils";

export type GridState = {
  kpiOrder: string[];
  kpiDefsByKey: Record<string, any>;
  classConfigByClass: Record<"P4P" | "SMART" | "TECH", Record<string, any>>;
  rubricByClass: Record<"P4P" | "SMART" | "TECH", Record<string, Record<string, any>>>;
};

const CLASSES = ["P4P", "SMART", "TECH"] as const;

export function buildStateFromDb(kpiDefs: any[], classConfig: any[], rubricRows: any[]): GridState {
  const kpiDefsByKey: Record<string, any> = {};
  const kpiOrder: string[] = [];

  for (const d of kpiDefs ?? []) {
    const key = String(d.kpi_key);
    kpiDefsByKey[key] = d;
    kpiOrder.push(key);
  }

  const classConfigByClass: any = { P4P: {}, SMART: {}, TECH: {} };

  for (const c of classConfig ?? []) {
    const cls = String(c.class_type).toUpperCase();
    const k = String(c.kpi_key);
    if (cls === "P4P" || cls === "SMART" || cls === "TECH") {
      classConfigByClass[cls][k] = c;
    }
  }

  // Ensure every KPI has config rows (client-side default shell)
  for (const cls of CLASSES) {
    for (const k of kpiOrder) {
      if (!classConfigByClass[cls][k]) {
        classConfigByClass[cls][k] = {
          class_type: cls,
          kpi_key: k,
          enabled: false,
          weight_percent: null,
          threshold: null,
          grade_value: null,
        };
      }
    }
  }

  const rubricByClass: any = { P4P: {}, SMART: {}, TECH: {} };

  // Normalize rubric rows into class->kpi->band
  for (const r of rubricRows ?? []) {
    const cls = String(r.class_type).toUpperCase();
    const k = String(r.kpi_key);
    const b = String(r.band_key).toUpperCase();
    if (!(cls === "P4P" || cls === "SMART" || cls === "TECH")) continue;

    if (!rubricByClass[cls][k]) rubricByClass[cls][k] = {};
    rubricByClass[cls][k][b] = r;
  }

  // Ensure rubric shells exist for each KPI/band
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
          };
        }
      }
    }
  }

  return { kpiOrder, kpiDefsByKey, classConfigByClass, rubricByClass };
}

export function serializeStateToPayload(state: GridState) {
  const kpiDefs: any[] = [];
  for (const k of state.kpiOrder) {
    const d = state.kpiDefsByKey[k];
    if (!d) continue;
    kpiDefs.push({
      kpi_key: d.kpi_key,
      label: d.label ?? null,
      customer_label: d.customer_label ?? null,
      raw_label_identifier: d.raw_label_identifier ?? null,
    });
  }

  const classConfig: any[] = [];
  for (const cls of CLASSES) {
    for (const k of state.kpiOrder) {
      const c = state.classConfigByClass[cls][k];
      if (!c) continue;

      classConfig.push({
        class_type: cls,
        kpi_key: k,
        enabled: !!c.enabled,
        weight_percent: c.weight_percent ?? null,
        threshold: c.threshold ?? null,
        grade_value: c.grade_value ?? null,
      });
    }
  }

  const rubricRows: any[] = [];
  for (const cls of CLASSES) {
    for (const k of state.kpiOrder) {
      const byBand = state.rubricByClass[cls][k] ?? {};
      for (const band of BANDS) {
        const r = byBand[band];
        if (!r) continue;
        rubricRows.push({
          class_type: cls,
          kpi_key: k,
          band_key: band,
          min_value: r.min_value ?? null,
          max_value: r.max_value ?? null,
          score_value: r.score_value ?? null,
          color_hex: r.color_hex ?? null,
        });
      }
    }
  }

  return { kpiDefs, classConfig, rubricRows };
}