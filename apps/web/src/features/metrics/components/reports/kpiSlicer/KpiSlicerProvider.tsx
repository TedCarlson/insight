// apps/web/src/features/metrics/components/reports/kpiSlicer/KpiSlicerProvider.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { BandKey } from "@/features/metrics-reports/lib/score";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";

type RowLike = {
  tech_id: string | number;
  rank_in_pc?: number | null;
  weighted_score?: number | string | null;
  status_badge?: string | null;

  person_id?: string | null;
  reports_to_person_id?: string | null;

  // injected for display
  __full_name?: string;
  __reports_to_name?: string;

  // dynamic KPI + band fields
  [k: string]: any;
};

type SliceBand = "NEEDS_IMPROVEMENT" | "MISSES";

type Ctx = {
  openForKpi: (kpiKey: string) => void;
};

const KpiSlicerCtx = createContext<Ctx | null>(null);

export function useKpiSlicer() {
  const ctx = useContext(KpiSlicerCtx);
  if (!ctx) throw new Error("useKpiSlicer must be used within KpiSlicerProvider");
  return ctx;
}

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Overlay({
  isOpen,
  onClose,
  title,
  rows,
  kpis,
  preset,
  initialKpiKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  rows: RowLike[];
  kpis: KpiDef[];
  preset: Record<string, any>;
  initialKpiKey?: string | null;
}) {
  const [activeKpiKey, setActiveKpiKey] = useState<string>(kpis[0]?.key ?? "TNPS");
  const [bands, setBands] = useState<Record<SliceBand, boolean>>({
    NEEDS_IMPROVEMENT: true,
    MISSES: true,
  });

  // sync active KPI when opened (so clicking a KPI header opens that KPI)
  useEffect(() => {
    if (!isOpen) return;
    const next = initialKpiKey ?? kpis[0]?.key;
    if (next) setActiveKpiKey(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialKpiKey]);

  // ESC close + prevent background scroll
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const activeDef = useMemo(() => {
    const found = kpis.find((k) => k.key === activeKpiKey);
    return found ?? kpis[0];
  }, [kpis, activeKpiKey]);

  const activeBands = useMemo(() => {
    const selected: BandKey[] = [];
    if (bands.NEEDS_IMPROVEMENT) selected.push("NEEDS_IMPROVEMENT");
    if (bands.MISSES) selected.push("MISSES");
    return selected;
  }, [bands]);

  const matches = useMemo(() => {
    if (!activeDef) return { NEEDS_IMPROVEMENT: [], MISSES: [] as RowLike[] };

    const ni: RowLike[] = [];
    const mi: RowLike[] = [];

    for (const r of rows) {
      const band = (r[activeDef.bandField] ?? "NO_DATA") as BandKey;
      if (!activeBands.includes(band)) continue;

      if (band === "NEEDS_IMPROVEMENT") ni.push(r);
      if (band === "MISSES") mi.push(r);
    }

    const sorter = (a: RowLike, b: RowLike) => {
      const ra = a.rank_in_pc ?? Number.POSITIVE_INFINITY;
      const rb = b.rank_in_pc ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) return ra - rb;
      return String(a.tech_id).localeCompare(String(b.tech_id));
    };

    ni.sort(sorter);
    mi.sort(sorter);

    return { NEEDS_IMPROVEMENT: ni, MISSES: mi };
  }, [rows, activeDef, activeBands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* backdrop */}
      <button
        aria-label="Close slicer"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* panel */}
      <div className="absolute inset-0 p-2 sm:p-4 flex items-start justify-center">
        <div
          className={cls(
            "rounded-2xl border bg-[var(--to-surface)] shadow-xl overflow-hidden",
            "w-[calc(100vw-1rem)] sm:w-full",
            "max-w-3xl",
            "max-h-[85vh]",
            "flex flex-col"
          )}
          style={{ borderColor: "var(--to-border)" }}
        >
          {/* sticky header */}
          <div
            className="sticky top-0 z-10 bg-[var(--to-surface)] border-b"
            style={{ borderColor: "var(--to-border)" }}
          >
            <div className="px-3 sm:px-4 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-5">{title}</div>
                <div className="text-[11px] text-[var(--to-ink-muted)] leading-4 truncate">
                  KPI slicer • Needs Improvement / Misses
                </div>
              </div>

              <button
                onClick={onClose}
                className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
                style={{ borderColor: "var(--to-border)" }}
              >
                Close
              </button>
            </div>

            {/* controls (still in header so they stay visible) */}
            <div className="px-3 sm:px-4 pb-3 grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-medium text-[var(--to-ink-muted)] mr-1">
                  KPI
                </div>

                {kpis.map((k) => {
                  const active = k.key === activeDef?.key;
                  return (
                    <button
                      key={k.key}
                      onClick={() => setActiveKpiKey(k.key)}
                      className={cls(
                        "rounded-xl border px-3 py-1.5 text-sm font-semibold",
                        active && "shadow-sm"
                      )}
                      style={{
                        borderColor: "var(--to-border)",
                        background: active ? "var(--to-row-hover)" : "transparent",
                      }}
                    >
                      {k.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs font-medium text-[var(--to-ink-muted)] mr-1">
                  Rubric slice
                </div>

                {(["NEEDS_IMPROVEMENT", "MISSES"] as SliceBand[]).map((b) => (
                  <label key={b} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={bands[b]}
                      onChange={(e) =>
                        setBands((prev) => ({ ...prev, [b]: e.target.checked }))
                      }
                    />
                    <span className="font-medium">
                      {b === "NEEDS_IMPROVEMENT" ? "Needs Improvement" : "Misses"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* scroll body */}
          <div className="flex-1 overflow-auto px-3 sm:px-4 py-3">
            <div className="grid gap-3">
              {(["NEEDS_IMPROVEMENT", "MISSES"] as SliceBand[]).map((b) => {
                const list = matches[b];
                if (!bands[b]) return null;

                const label = b === "NEEDS_IMPROVEMENT" ? "Needs Improvement" : "Misses";

                return (
                  <div
                    key={b}
                    className="rounded-xl border p-3 sm:p-4"
                    style={{ borderColor: "var(--to-border)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{label}</div>
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        {list.length} tech{list.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    {list.length === 0 ? (
                      <div className="text-sm text-[var(--to-ink-muted)] mt-3">
                        No techs in this slice.
                      </div>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="text-xs text-[var(--to-ink-muted)] sticky top-0 bg-[var(--to-surface)]">
                            <tr>
                              <th className="text-left py-2 pr-3">Tech • Name</th>
                              <th className="text-left py-2 pr-3">Reports To</th>
                              <th className="text-right py-2 pr-3">Rank</th>
                              <th className="text-right py-2">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((r) => {
                              const v = activeDef ? r[activeDef.valueField] : null;
                              const name = r.__full_name ?? "—";
                              const rpt = r.__reports_to_name ?? "—";
                              const tech = String(r.tech_id);

                              return (
                                <tr
                                  key={`${b}-${tech}`}
                                  className="border-t"
                                  style={{ borderColor: "var(--to-border)" }}
                                >
                                  <td className="py-2 pr-3">
                                    <span className="font-mono tabular-nums">{tech}</span>
                                    <span className="mx-2 text-[var(--to-ink-muted)]">•</span>
                                    <span className="truncate">{name}</span>
                                  </td>

                                  <td className="py-2 pr-3">{rpt}</td>

                                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                                    {r.rank_in_pc ?? "—"}
                                  </td>

                                  <td className="py-2 text-right font-mono tabular-nums">
                                    {v ?? "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* sticky footer */}
          <div
            className="sticky bottom-0 z-10 bg-[var(--to-surface)] border-t"
            style={{ borderColor: "var(--to-border)" }}
          >
            <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-[var(--to-ink-muted)] truncate">
                Tip: scroll inside the panel • ESC closes
              </div>

              <button
                type="button"
                className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KpiSlicerProvider({
  children,
  title,
  rows,
  kpis,
  preset,
}: {
  children: ReactNode;
  title: string;
  rows: RowLike[];
  kpis: KpiDef[];
  preset: Record<string, any>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialKpiKey, setInitialKpiKey] = useState<string | null>(null);

  const openForKpi = useCallback((kpiKey: string) => {
    setInitialKpiKey(kpiKey);
    setIsOpen(true);
  }, []);

  const ctx = useMemo<Ctx>(() => ({ openForKpi }), [openForKpi]);

  return (
    <KpiSlicerCtx.Provider value={ctx}>
      {children}
      <Overlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        rows={rows}
        kpis={kpis}
        preset={preset}
        initialKpiKey={initialKpiKey}
      />
    </KpiSlicerCtx.Provider>
  );
}