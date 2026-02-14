"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
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
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  rows: RowLike[];
  kpis: KpiDef[];
  preset: Record<string, any>;
}) {
  const [activeKpiKey, setActiveKpiKey] = useState<string>(kpis[0]?.key ?? "TNPS");
  const [bands, setBands] = useState<Record<SliceBand, boolean>>({
    NEEDS_IMPROVEMENT: true,
    MISSES: true,
  });

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
      <button
        aria-label="Close slicer"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-10 w-[min(980px,calc(100vw-24px))] -translate-x-1/2">
        <div className="rounded-2xl border bg-[var(--to-surface)] shadow-xl overflow-hidden">
          <div
            className="flex items-start justify-between gap-4 border-b px-5 py-4"
            style={{ borderColor: "var(--to-border)" }}
          >
            <div>
              <div className="text-base font-semibold">{title}</div>
              <div className="text-xs text-[var(--to-ink-muted)] mt-0.5">
                KPI slicer • Needs Improvement / Misses
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-sm hover:opacity-80"
              style={{ borderColor: "var(--to-border)" }}
            >
              Close
            </button>
          </div>

          <div className="px-5 py-4 grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-medium text-[var(--to-ink-muted)] mr-2">
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
              <div className="text-xs font-medium text-[var(--to-ink-muted)] mr-2">
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

          <div
            className="border-t px-5 py-4 grid gap-4"
            style={{ borderColor: "var(--to-border)" }}
          >
            {(["NEEDS_IMPROVEMENT", "MISSES"] as SliceBand[]).map((b) => {
              const list = matches[b];
              if (!bands[b]) return null;

              const label =
                b === "NEEDS_IMPROVEMENT" ? "Needs Improvement" : "Misses";

              return (
                <div
                  key={b}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "var(--to-border)" }}
                >
                  <div className="flex items-center justify-between">
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
                        <thead className="text-xs text-[var(--to-ink-muted)]">
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
                                  <span className="font-mono tabular-nums">
                                    {tech}
                                  </span>
                                  <span className="mx-2 text-[var(--to-ink-muted)]">
                                    •
                                  </span>
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

  const openForKpi = useCallback((_kpiKey: string) => {
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
      />
    </KpiSlicerCtx.Provider>
  );
}