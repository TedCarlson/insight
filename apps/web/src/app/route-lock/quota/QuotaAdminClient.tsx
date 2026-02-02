// apps/web/src/app/route-lock/quota/QuotaAdminClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type RouteItem = {
  route_id: string;
  route_name: string;
};

type MonthItem = {
  fiscal_month_id: string;
  month_key: string; // YYYY-MM
  label: string; // FY2026 February
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
};

type QuotaRow = {
  quota_id: string;
  route_id: string;
  route_name: string;

  fiscal_month_id: string;
  fiscal_month_key: string; // YYYY-MM
  fiscal_month_label: string; // FY2026 February
  fiscal_month_start_date?: string;
  fiscal_month_end_date?: string;

  qh_sun: number;
  qh_mon: number;
  qh_tue: number;
  qh_wed: number;
  qh_thu: number;
  qh_fri: number;
  qh_sat: number;

  qt_hours: number;
  qt_units: number;
};

type DisplayMode = "hours" | "units" | "techs";

const DAYS: Array<{
  key: keyof Pick<QuotaRow, "qh_sun" | "qh_mon" | "qh_tue" | "qh_wed" | "qh_thu" | "qh_fri" | "qh_sat">;
  label: string;
}> = [
  { key: "qh_sun", label: "Sun" },
  { key: "qh_mon", label: "Mon" },
  { key: "qh_tue", label: "Tue" },
  { key: "qh_wed", label: "Wed" },
  { key: "qh_thu", label: "Thu" },
  { key: "qh_fri", label: "Fri" },
  { key: "qh_sat", label: "Sat" },
];

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function hoursToUnits(hours: number) {
  return hours * 12;
}

function hoursToTechs(hours: number) {
  // Ops estimate: whole tech-days only
  return Math.ceil(hours / 8);
}

function displayValue(mode: DisplayMode, hours: number) {
  if (mode === "hours") return hours;
  if (mode === "units") return hoursToUnits(hours);
  return hoursToTechs(hours);
}

function fiscalShortFromLabel(label: string) {
  // "FY2026 February" => "FY26 Feb"
  const m = String(label ?? "").trim().match(/^FY(\d{4})\s+([A-Za-z]+)/);
  if (!m) return String(label ?? "").trim() || "—";
  const yy = m[1].slice(-2);
  const mon = m[2].slice(0, 3);
  return `FY${yy} ${mon}`;
}

function fiscalShortFromRow(r: Pick<QuotaRow, "fiscal_month_label">) {
  return fiscalShortFromLabel(r.fiscal_month_label);
}

export default function QuotaAdminClient() {
  /**
   * IMPORTANT:
   * We do NOT rely on client-side org state.
   * The API derives the selected PC org from the user's profile on the server.
   */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [months, setMonths] = useState<MonthItem[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("");

  const [mode, setMode] = useState<DisplayMode>("hours");

  const [monthRows, setMonthRows] = useState<QuotaRow[]>([]);
  const [historyRows, setHistoryRows] = useState<QuotaRow[]>([]);

  // Card 2: write block
  const [writeMonthId, setWriteMonthId] = useState<string>("");
  const [writeRows, setWriteRows] = useState<
    Array<{
      route_id: string;
      qh_sun: number;
      qh_mon: number;
      qh_tue: number;
      qh_wed: number;
      qh_thu: number;
      qh_fri: number;
      qh_sat: number;
    }>
  >([{ route_id: "", qh_sun: 0, qh_mon: 0, qh_tue: 0, qh_wed: 0, qh_thu: 0, qh_fri: 0, qh_sat: 0 }]);

  // Card 3 filters
  const [historyMonthId, setHistoryMonthId] = useState<string>("");
  const [historyQuery, setHistoryQuery] = useState<string>("");

  const fetchLookups = async () => {
    setLoading(true);
    setErr(null);
    setNotice(null);

    try {
      const res = await fetch("/api/route-lock/quota/lookups", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Lookups failed (${res.status})`);

      const nextRoutes = (json?.routes ?? []) as RouteItem[];
      const nextMonths = (json?.months ?? []) as MonthItem[];

      setRoutes(nextRoutes);
      setMonths(nextMonths);

      // Default month = most recent (API orders by start_date DESC)
      const defaultMonthId = nextMonths[0]?.fiscal_month_id ?? "";
      setSelectedMonthId((prev) => prev || defaultMonthId);
      setWriteMonthId((prev) => prev || defaultMonthId);
    } catch (e: any) {
      setRoutes([]);
      setMonths([]);
      setSelectedMonthId("");
      setWriteMonthId("");
      setMonthRows([]);
      setHistoryRows([]);
      setErr(e?.message ?? String(e ?? "Lookups failed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchMonth = async (fiscalMonthId: string) => {
    if (!fiscalMonthId) {
      setMonthRows([]);
      return;
    }

    setErr(null);
    setNotice(null);

    try {
      const res = await fetch("/api/route-lock/quota/list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fiscal_month_id: fiscalMonthId, limit: 800 }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `List failed (${res.status})`);

      setMonthRows((json?.items ?? []) as QuotaRow[]);
    } catch (e: any) {
      setMonthRows([]);
      setErr(e?.message ?? String(e ?? "List failed"));
    }
  };

  const fetchHistory = async () => {
    setErr(null);
    setNotice(null);

    try {
      const res = await fetch("/api/route-lock/quota/list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 1500 }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `History failed (${res.status})`);

      setHistoryRows((json?.items ?? []) as QuotaRow[]);
    } catch (e: any) {
      setHistoryRows([]);
      setErr(e?.message ?? String(e ?? "History failed"));
    }
  };

  useEffect(() => {
    void fetchLookups();
  }, []);

  useEffect(() => {
    void fetchMonth(selectedMonthId);
  }, [selectedMonthId]);

  useEffect(() => {
    void fetchHistory();
  }, []);

  // Card 1: show ONLY routes that have >0 weekly hours (leans out the view)
  const rowsByRoute = useMemo(() => {
    const map = new Map<
      string,
      {
        route_id: string;
        route_name: string;
        qh_sun: number;
        qh_mon: number;
        qh_tue: number;
        qh_wed: number;
        qh_thu: number;
        qh_fri: number;
        qh_sat: number;
      }
    >();

    const add = (rid: string, patch: any) => {
      const prev = map.get(rid);
      if (!prev) {
        map.set(rid, { route_id: rid, ...patch });
        return;
      }
      prev.qh_sun += toInt(patch.qh_sun);
      prev.qh_mon += toInt(patch.qh_mon);
      prev.qh_tue += toInt(patch.qh_tue);
      prev.qh_wed += toInt(patch.qh_wed);
      prev.qh_thu += toInt(patch.qh_thu);
      prev.qh_fri += toInt(patch.qh_fri);
      prev.qh_sat += toInt(patch.qh_sat);
    };

    for (const r of monthRows ?? []) {
      const rid = String((r as any)?.route_id ?? "").trim();
      if (!rid) continue;

      const qh_sun = toInt((r as any)?.qh_sun);
      const qh_mon = toInt((r as any)?.qh_mon);
      const qh_tue = toInt((r as any)?.qh_tue);
      const qh_wed = toInt((r as any)?.qh_wed);
      const qh_thu = toInt((r as any)?.qh_thu);
      const qh_fri = toInt((r as any)?.qh_fri);
      const qh_sat = toInt((r as any)?.qh_sat);

      const weekly = qh_sun + qh_mon + qh_tue + qh_wed + qh_thu + qh_fri + qh_sat;
      if (weekly <= 0) continue;

      add(rid, {
        route_name: String((r as any)?.route_name ?? ""),
        qh_sun,
        qh_mon,
        qh_tue,
        qh_wed,
        qh_thu,
        qh_fri,
        qh_sat,
      });
    }

    const list = Array.from(map.values()).map((x) => {
      if (!x.route_name) {
        const rr = (routes ?? []).find((rt) => String(rt.route_id) === x.route_id);
        x.route_name = rr?.route_name ?? x.route_id;
      }
      return x;
    });

    list.sort((a, b) => String(a.route_name).localeCompare(String(b.route_name), undefined, { sensitivity: "base" }));
    return list;
  }, [monthRows, routes]);

  const totals = useMemo(() => {
    const dayHours = { qh_sun: 0, qh_mon: 0, qh_tue: 0, qh_wed: 0, qh_thu: 0, qh_fri: 0, qh_sat: 0 };
    let totalHours = 0;

    for (const r of rowsByRoute) {
      for (const d of DAYS) {
        const h = toInt((r as any)[d.key]);
        (dayHours as any)[d.key] += h;
        totalHours += h;
      }
    }

    const totalUnits = hoursToUnits(totalHours);

    // tech-days: sum ceil(day/8) across days
    let techDays = 0;
    for (const d of DAYS) techDays += hoursToTechs((dayHours as any)[d.key] as number);

    return { dayHours, totalHours, totalUnits, techDays };
  }, [rowsByRoute]);

  const selectedMonth = useMemo(() => months.find((m) => m.fiscal_month_id === selectedMonthId) ?? null, [months, selectedMonthId]);

  const addWriteRow = () => {
    setWriteRows((prev) => [
      ...prev,
      { route_id: "", qh_sun: 0, qh_mon: 0, qh_tue: 0, qh_wed: 0, qh_thu: 0, qh_fri: 0, qh_sat: 0 },
    ]);
  };

  const clearWrite = () => {
    setWriteRows([{ route_id: "", qh_sun: 0, qh_mon: 0, qh_tue: 0, qh_wed: 0, qh_thu: 0, qh_fri: 0, qh_sat: 0 }]);
  };

  const writeRowTotals = (r: any) => {
    const day = [
      toInt(r.qh_sun),
      toInt(r.qh_mon),
      toInt(r.qh_tue),
      toInt(r.qh_wed),
      toInt(r.qh_thu),
      toInt(r.qh_fri),
      toInt(r.qh_sat),
    ];
    const hours = day.reduce((a, b) => a + b, 0);
    const units = hoursToUnits(hours);
    const techs = day.reduce((a, h) => a + hoursToTechs(h), 0);
    return { hours, units, techs };
  };

  const saveRows = async () => {
    setErr(null);
    setNotice(null);

    if (!writeMonthId) {
      setErr("Select a fiscal month before saving.");
      return;
    }

    const payload = writeRows
      .filter((r) => String(r.route_id ?? "").trim())
      .map((r) => ({
        route_id: String(r.route_id).trim(),
        fiscal_month_id: writeMonthId,
        qh_sun: toInt(r.qh_sun),
        qh_mon: toInt(r.qh_mon),
        qh_tue: toInt(r.qh_tue),
        qh_wed: toInt(r.qh_wed),
        qh_thu: toInt(r.qh_thu),
        qh_fri: toInt(r.qh_fri),
        qh_sat: toInt(r.qh_sat),
      }));

    if (payload.length === 0) {
      setErr("Add at least one row (select a route).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/route-lock/quota/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Upsert failed (${res.status})`);

      setNotice(`Saved ${payload.length} row(s).`);

      // Refresh read + history after save
      await Promise.all([fetchMonth(selectedMonthId || writeMonthId), fetchHistory()]);
    } catch (e: any) {
      setErr(e?.message ?? String(e ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const filteredHistoryRows = useMemo(() => {
    let out = (historyRows ?? []).slice();

    if (historyMonthId) {
      out = out.filter((r) => String(r.fiscal_month_id) === String(historyMonthId));
    }

    const q = historyQuery.trim().toLowerCase();
    if (q) {
      out = out.filter((r) => {
        const hay = [fiscalShortFromRow(r), r.route_name, r.fiscal_month_label, r.fiscal_month_key]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // default sort: fiscal month desc then route name
    out.sort((a, b) => {
      const aStart = String((a as any)?.fiscal_month_start_date ?? "");
      const bStart = String((b as any)?.fiscal_month_start_date ?? "");
      if (aStart && bStart && aStart !== bStart) return bStart.localeCompare(aStart);
      const aKey = String(a.fiscal_month_key ?? "");
      const bKey = String(b.fiscal_month_key ?? "");
      if (aKey && bKey && aKey !== bKey) return bKey.localeCompare(aKey);
      return String(a.route_name ?? "").localeCompare(String(b.route_name ?? ""), undefined, { sensitivity: "base" });
    });

    return out;
  }, [historyRows, historyMonthId, historyQuery]);

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <Card>
        <div className="flex items-center gap-3">
          <Button variant="secondary">
            <Link href="/route-lock">Back</Link>
          </Button>
          <div>
            <div className="text-sm font-semibold">Quota</div>
            <div className="text-xs text-[var(--to-ink-muted)]">Route Lock • Monthly quota targets by route</div>
          </div>
          <div className="ml-auto">
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={fetchLookups} disabled={loading || saving}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {err ? (
        <Card className="mt-3">
          <div className="text-sm font-semibold text-[var(--to-status-danger)]">Quota error</div>
          <div className="text-sm text-[var(--to-ink-muted)]">{err}</div>
        </Card>
      ) : null}

      {notice ? (
        <Card className="mt-3">
          <div className="text-sm font-semibold">Success</div>
          <div className="text-sm text-[var(--to-ink-muted)]">{notice}</div>
        </Card>
      ) : null}

      {/* Card 1: READ */}
      <Card className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold mr-2">Quota</div>

          <Select value={selectedMonthId} onChange={(e) => setSelectedMonthId(e.target.value)} className="w-60" disabled={months.length === 0}>
            {months.length === 0 ? <option value="">No months</option> : null}
            {months.map((m) => (
              <option key={m.fiscal_month_id} value={m.fiscal_month_id}>
                {fiscalShortFromLabel(m.label)}
              </option>
            ))}
          </Select>

          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as DisplayMode)}
            size="sm"
            options={[
              { value: "hours", label: "Hours" },
              { value: "units", label: "Units" },
              { value: "techs", label: "Techs" },
            ]}
          />

          <div className="ml-auto flex items-center gap-3 text-xs text-[var(--to-ink-muted)]">
            <span>
              Routes w/ Quota: <span className="text-[var(--to-ink)]">{rowsByRoute.length}</span>
            </span>
            <span>
              Routes: <span className="text-[var(--to-ink)]">{routes.length}</span>
            </span>
            <span>
              Hours: <span className="text-[var(--to-ink)]">{totals.totalHours}</span>
            </span>
            <span>
              Units: <span className="text-[var(--to-ink)]">{totals.totalUnits}</span>
            </span>
            <span>
              Techs: <span className="text-[var(--to-ink)]">{totals.techDays}</span>
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-auto rounded border border-[var(--to-border)]">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr>
                <th className="text-left p-2 w-56">Route</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="text-right p-2">
                    {d.label}
                  </th>
                ))}
                <th className="text-right p-2">Weekly</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-t border-[var(--to-border)]">
                <td className="p-2 text-[var(--to-ink-muted)]">Totals</td>
                {DAYS.map((d) => (
                  <td key={d.key} className="p-2 text-right">
                    {displayValue(mode, (totals.dayHours as any)[d.key])}
                  </td>
                ))}
                <td className="p-2 text-right">{displayValue(mode, totals.totalHours)}</td>
              </tr>

              {rowsByRoute.length === 0 ? (
                <tr className="border-t border-[var(--to-border)]">
                  <td colSpan={9} className="p-3 text-[var(--to-ink-muted)]">
                    No routes with quota for this month.
                  </td>
                </tr>
              ) : null}

              {rowsByRoute.map((r) => {
                const weekly =
                  toInt(r.qh_sun) + toInt(r.qh_mon) + toInt(r.qh_tue) + toInt(r.qh_wed) + toInt(r.qh_thu) + toInt(r.qh_fri) + toInt(r.qh_sat);

                return (
                  <tr key={r.route_id} className="border-t border-[var(--to-border)]">
                    <td className="p-2 font-medium">{r.route_name}</td>
                    {DAYS.map((d) => (
                      <td key={d.key} className="p-2 text-right">
                        {displayValue(mode, toInt((r as any)[d.key]))}
                      </td>
                    ))}
                    <td className="p-2 text-right">{displayValue(mode, weekly)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
          Showing {rowsByRoute.length} route(s) for {selectedMonth ? fiscalShortFromLabel(selectedMonth.label) : "—"}. Techs are derived as <b>ceil(hours / 8)</b> per day.
        </div>
      </Card>

      {/* Card 2: WRITE */}
      <Card className="mt-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Write</div>
          <div className="text-xs text-[var(--to-ink-muted)]">Block upsert grid (add rows + commit)</div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={addWriteRow}>
              Add row
            </Button>
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={clearWrite}>
              Clear
            </Button>
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={saveRows} disabled={saving || loading || !writeMonthId}>
              {saving ? "Saving..." : "Save rows"}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="text-xs text-[var(--to-ink-muted)]">Fiscal month</div>
          <Select value={writeMonthId} onChange={(e) => setWriteMonthId(e.target.value)} className="w-60" disabled={months.length === 0}>
            {months.length === 0 ? <option value="">No months</option> : null}
            {months.map((m) => (
              <option key={m.fiscal_month_id} value={m.fiscal_month_id}>
                {fiscalShortFromLabel(m.label)}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 overflow-auto rounded border border-[var(--to-border)]">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr>
                <th className="text-left p-2 w-64">Route</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="text-right p-2">
                    {d.label} (hrs)
                  </th>
                ))}
                <th className="text-right p-2">Weekly</th>
                <th className="text-right p-2" />
              </tr>
            </thead>
            <tbody>
              {writeRows.map((r, idx) => {
                const t = writeRowTotals(r);
                return (
                  <tr key={idx} className="border-t border-[var(--to-border)]">
                    <td className="p-2">
                      <Select
                        value={r.route_id}
                        onChange={(e) => {
                          const v = e.target.value;
                          setWriteRows((prev) => prev.map((x, i) => (i === idx ? { ...x, route_id: v } : x)));
                        }}
                        disabled={routes.length === 0}
                        className="w-56"
                      >
                        <option value="">Select a route...</option>
                        {routes.map((rt) => (
                          <option key={rt.route_id} value={rt.route_id}>
                            {rt.route_name}
                          </option>
                        ))}
                      </Select>
                      <div className="mt-1 text-xs text-[var(--to-ink-muted)]">Units: {t.units} • Techs: {t.techs}</div>
                    </td>

                    {DAYS.map((d) => {
                      const k = d.key as any;
                      return (
                        <td key={d.key} className="p-2 text-right">
                          <input
                            className="h-9 w-20 rounded border border-[var(--to-border)] px-2 text-right"
                            value={(r as any)[k]}
                            inputMode="numeric"
                            onChange={(e) => {
                              const v = toInt(e.target.value);
                              setWriteRows((prev) => prev.map((x, i) => (i === idx ? { ...x, [k]: v } : x)));
                            }}
                          />
                        </td>
                      );
                    })}

                    <td className="p-2 text-right font-medium">{t.hours}</td>

                    <td className="p-2 text-right">
                      <Button
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => setWriteRows((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={writeRows.length <= 1}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
          Writes to <code>public.quota</code>. DB-generated fields (<code>qu_*</code>, <code>qt_hours</code>, <code>qt_units</code>) are derived from <code>qh_*</code>.
          Techs are UI-only (whole tech-days via <b>ceil(hours / 8)</b>).
        </div>
      </Card>

      {/* Card 3: HISTORY */}
      <Card className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">History</div>
          <div className="text-xs text-[var(--to-ink-muted)]">All rows (inline table)</div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={historyMonthId} onChange={(e) => setHistoryMonthId(e.target.value)} className="w-48" disabled={months.length === 0}>
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m.fiscal_month_id} value={m.fiscal_month_id}>
                  {fiscalShortFromLabel(m.label)}
                </option>
              ))}
            </Select>

            <TextInput value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder="Search (route or month)..." className="w-56" />

            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={fetchHistory} disabled={loading || saving}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-3 overflow-auto rounded border border-[var(--to-border)]">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr>
                <th className="text-left p-2 w-32">Fiscal month</th>
                <th className="text-left p-2 w-56">Route</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="text-right p-2">
                    {d.label}
                  </th>
                ))}
                <th className="text-right p-2">Weekly</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryRows.length === 0 ? (
                <tr className="border-t border-[var(--to-border)]">
                  <td colSpan={10} className="p-3 text-[var(--to-ink-muted)]">
                    No quota rows yet.
                  </td>
                </tr>
              ) : (
                filteredHistoryRows.map((r) => {
                  const weekly =
                    toInt(r.qh_sun) +
                    toInt(r.qh_mon) +
                    toInt(r.qh_tue) +
                    toInt(r.qh_wed) +
                    toInt(r.qh_thu) +
                    toInt(r.qh_fri) +
                    toInt(r.qh_sat);

                  return (
                    <tr key={r.quota_id} className="border-t border-[var(--to-border)]">
                      <td className="p-2 text-[var(--to-ink-muted)]">{fiscalShortFromRow(r)}</td>
                      <td className="p-2 font-medium">{r.route_name}</td>
                      {DAYS.map((d) => (
                        <td key={d.key} className="p-2 text-right">
                          {toInt((r as any)[d.key])}
                        </td>
                      ))}
                      <td className="p-2 text-right font-medium">{weekly}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}