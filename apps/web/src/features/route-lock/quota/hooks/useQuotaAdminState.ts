"use client";

import { useMemo, useState, useCallback } from "react";
import type { MonthItem, QuotaRow, QuotaUpsertRow, RouteItem } from "./useQuotaAdminData";
import { DAY_KEYS, sumRowHours, toInt, type DayKey } from "../lib/quotaMath";

export type DraftQuotaRow = {
  route_id: string;
  route_name: string;
  fiscal_month_id: string;
  qh_sun: number;
  qh_mon: number;
  qh_tue: number;
  qh_wed: number;
  qh_thu: number;
  qh_fri: number;
  qh_sat: number;
};

function clampNonNeg(n: number): number {
  return n < 0 ? 0 : n;
}

function firstMonthId(months: MonthItem[]) {
  return months[0]?.fiscal_month_id ?? "";
}

function dayVal(v: unknown): number {
  // hours should be integer-ish; keep consistent coercion everywhere
  return clampNonNeg(toInt(v));
}

export function useQuotaAdminState(args: {
  routes: RouteItem[];
  months: MonthItem[];
  monthRows: QuotaRow[];
  historyRows: QuotaRow[];
}) {
  const { routes, months, monthRows, historyRows } = args;

  // IMPORTANT: initialize from months on first render (no effect)
  const [selectedMonthId, setSelectedMonthId] = useState<string>(() => firstMonthId(months));
  const [writeMonthId, _setWriteMonthId] = useState<string>(() => firstMonthId(months));

  // Filters
  const [filter, setFilter] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [historyMonthId, setHistoryMonthId] = useState<string>("");

  // Draft rows keyed by route_id
  const [draftByRouteId, setDraftByRouteId] = useState<Record<string, DraftQuotaRow>>({});

  // Expose a "safe" setter that also clears drafts when month changes (no effect needed).
  const setWriteMonthId = useCallback((next: string) => {
    _setWriteMonthId(next);
    setDraftByRouteId({}); // intentional: changing write month resets drafts
  }, []);

  const monthById = useMemo(() => {
    const m: Record<string, MonthItem> = {};
    for (const x of months) m[x.fiscal_month_id] = x;
    return m;
  }, [months]);

  const routeById = useMemo(() => {
    const m: Record<string, RouteItem> = {};
    for (const r of routes) m[r.route_id] = r;
    return m;
  }, [routes]);

  const filteredMonthRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return monthRows;

    return monthRows.filter((r) => {
      const name = String(r.route_name ?? "").toLowerCase();
      const id = String(r.route_id ?? "").toLowerCase();
      const m = String(r.fiscal_month_label ?? r.fiscal_month_key ?? "").toLowerCase();
      return name.includes(q) || id.includes(q) || m.includes(q);
    });
  }, [monthRows, filter]);

  const filteredHistoryRows = useMemo(() => {
    const q = historyFilter.trim().toLowerCase();
    const monthGate = historyMonthId ? historyMonthId : null;

    return historyRows.filter((r) => {
      if (monthGate && r.fiscal_month_id !== monthGate) return false;
      if (!q) return true;
      const name = String(r.route_name ?? "").toLowerCase();
      const id = String(r.route_id ?? "").toLowerCase();
      const m = String(r.fiscal_month_label ?? r.fiscal_month_key ?? "").toLowerCase();
      return name.includes(q) || id.includes(q) || m.includes(q);
    });
  }, [historyRows, historyFilter, historyMonthId]);

  const ensureDraft = useCallback(
    (routeId: string) => {
      if (!writeMonthId) return;

      setDraftByRouteId((prev) => {
        if (prev[routeId]) return prev;

        const existing = monthRows.find((r) => r.route_id === routeId && r.fiscal_month_id === writeMonthId);
        const route = routeById[routeId];

        const draft: DraftQuotaRow = {
          route_id: routeId,
          route_name: route?.route_name ?? existing?.route_name ?? routeId,
          fiscal_month_id: writeMonthId,
          qh_sun: dayVal(existing?.qh_sun ?? 0),
          qh_mon: dayVal(existing?.qh_mon ?? 0),
          qh_tue: dayVal(existing?.qh_tue ?? 0),
          qh_wed: dayVal(existing?.qh_wed ?? 0),
          qh_thu: dayVal(existing?.qh_thu ?? 0),
          qh_fri: dayVal(existing?.qh_fri ?? 0),
          qh_sat: dayVal(existing?.qh_sat ?? 0),
        };

        return { ...prev, [routeId]: draft };
      });
    },
    [monthRows, routeById, writeMonthId]
  );

  const removeDraft = useCallback((routeId: string) => {
    setDraftByRouteId((prev) => {
      if (!prev[routeId]) return prev;
      const next = { ...prev };
      delete next[routeId];
      return next;
    });
  }, []);

  const setDraftHour = useCallback((routeId: string, key: DayKey, value: number) => {
    setDraftByRouteId((prev) => {
      const row = prev[routeId];
      if (!row) return prev;
      return {
        ...prev,
        [routeId]: { ...row, [key]: dayVal(value) },
      };
    });
  }, []);

  const draftRows = useMemo(() => Object.values(draftByRouteId), [draftByRouteId]);

  const draftTotalsByRouteId = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of draftRows) m[r.route_id] = sumRowHours(r as any);
    return m;
  }, [draftRows]);

  const buildUpsertRows = useCallback((): QuotaUpsertRow[] => {
    const rows: QuotaUpsertRow[] = [];

    for (const d of Object.values(draftByRouteId)) {
      if (!d.fiscal_month_id) continue;

      const total = sumRowHours(d as any);
      if (total === 0) continue;

      rows.push({
        route_id: d.route_id,
        fiscal_month_id: d.fiscal_month_id,
        qh_sun: dayVal(d.qh_sun),
        qh_mon: dayVal(d.qh_mon),
        qh_tue: dayVal(d.qh_tue),
        qh_wed: dayVal(d.qh_wed),
        qh_thu: dayVal(d.qh_thu),
        qh_fri: dayVal(d.qh_fri),
        qh_sat: dayVal(d.qh_sat),
      });
    }

    return rows;
  }, [draftByRouteId]);

  return {
    // month selection
    selectedMonthId,
    setSelectedMonthId,
    writeMonthId,
    setWriteMonthId,

    // filters
    filter,
    setFilter,
    historyFilter,
    setHistoryFilter,
    historyMonthId,
    setHistoryMonthId,

    // lookup maps
    monthById,
    routeById,

    // computed datasets
    filteredMonthRows,
    filteredHistoryRows,

    // draft editing
    draftRows,
    draftTotalsByRouteId,
    ensureDraft,
    removeDraft,
    setDraftHour,

    // submit builder
    buildUpsertRows,
  };
}