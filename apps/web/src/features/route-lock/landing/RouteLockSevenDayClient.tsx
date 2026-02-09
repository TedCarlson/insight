"use client";

import { Card } from "@/components/ui/Card";

type Day = {
  date: string;

  quota_hours: number | null;
  quota_routes: number | null;

  scheduled_routes: number;
  scheduled_techs: number;

  total_headcount: number;
  util_pct: number | null;

  delta_forecast: number | null;

  has_sv: boolean;
  has_check_in: boolean;
};

function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}

function mmdd(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}

function pillClassForDelta(delta: number | null) {
  // Option B (pill tint):
  // Δ = 0 → neutral (no tint)
  // Δ = +1..+2 → green
  // Δ > +2 → amber
  // Δ < 0 → red
  if (delta === null) return "bg-[var(--to-surface-2)] border-[var(--to-border)]";
  if (delta === 0) return "bg-[var(--to-surface-2)] border-[var(--to-border)]";
  if (delta >= 1 && delta <= 2) return "bg-[rgba(16,185,129,0.16)] border-[rgba(16,185,129,0.35)]";
  if (delta > 2) return "bg-[rgba(234,179,8,0.18)] border-[rgba(234,179,8,0.40)]";
  return "bg-[rgba(239,68,68,0.20)] border-[rgba(239,68,68,0.45)]";
}

function tooltipForDay(d: Day) {
  const lines: string[] = [];

  if (d.quota_routes == null) {
    lines.push("Quota: missing (no demand target set)");
    lines.push("Action: add quota for this fiscal month/day.");
  } else {
    const delta = d.delta_forecast;
    const q = d.quota_routes;
    const on = d.scheduled_routes;

    lines.push(`On (Scheduled): ${on}`);
    lines.push(`Quota (Lock): ${q}`);

    if (delta == null) {
      lines.push("Δ: — (cannot compute)");
    } else if (delta < 0) {
      lines.push(`Δ: ${delta}  → SHORT`);
      lines.push(`Action: add ${Math.abs(delta)} route(s) / tech-day(s) or adjust quota.`);
    } else if (delta === 0) {
      lines.push("Δ: 0  → MEETS (no cushion)");
      lines.push("Note: consider +1 to +2 buffer to cover call-outs.");
    } else if (delta >= 1 && delta <= 2) {
      lines.push(`Δ: +${delta}  → BUFFERED (good)`);
    } else {
      lines.push(`Δ: +${delta}  → EXCEEDS (over plan)`);
      lines.push("Action: tighten schedule unless customer requests additional coverage.");
    }
  }

  if (d.total_headcount) {
    const util = d.util_pct == null ? "—" : `${d.util_pct}%`;
    lines.push(`HC: ${d.scheduled_techs}/${d.total_headcount} (${util})`);
  }

  lines.push(`Shift Validation: ${d.has_sv ? "present (V)" : "missing"}`);
  lines.push(`Check-In: ${d.has_check_in ? "present (C)" : "not available"}`);

  return lines.join("\n");
}

function n0(v: number | null | undefined): number {
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function pct(num: number, den: number): string {
  if (!den) return "—";
  const p = (num / den) * 100;
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p * 10) / 10}%`;
}

function fmtSigned(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : String(n);
}

export function RouteLockSevenDayClient(props: { days: Day[] }) {
  const days = props.days ?? [];

  if (!days.length) {
    return (
      <Card>
        <div className="text-sm font-semibold">Next 7 Days</div>
        <div className="mt-1 text-xs text-[var(--to-ink-muted)]">No days available for this window.</div>
      </Card>
    );
  }

  // --- totals (7-day summary) ---
  const totals = days.reduce(
    (acc, d) => {
      const qh = d.quota_hours;
      const qr = d.quota_routes;
      const on = d.scheduled_routes;

      acc.scheduled_routes += n0(on);
      acc.scheduled_hours += n0(on) * 8;
      acc.scheduled_units += n0(on) * 96;

      acc.quota_hours += n0(qh);
      acc.quota_routes += qr == null ? 0 : n0(qr);
      acc.quota_units += n0(qh) * 12;

      // for a clean "7-day delta" we compare totals in routes space
      if (qr != null) acc.delta_routes += n0(on) - n0(qr);

      acc.scheduled_techs += n0(d.scheduled_techs);

      // utilization (weighted by headcount days)
      if (d.total_headcount) {
        acc.headcount_days += n0(d.total_headcount);
        acc.on_days += n0(d.scheduled_techs);
      }

      acc.sv_days += d.has_sv ? 1 : 0;
      acc.ci_days += d.has_check_in ? 1 : 0;

      return acc;
    },
    {
      scheduled_routes: 0,
      scheduled_hours: 0,
      scheduled_units: 0,

      quota_hours: 0,
      quota_routes: 0,
      quota_units: 0,

      delta_routes: 0,

      scheduled_techs: 0,

      headcount_days: 0,
      on_days: 0,

      sv_days: 0,
      ci_days: 0,
    }
  );

  const totalUtil = pct(totals.on_days, totals.headcount_days);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Next 7 Days</div>
          <div className="text-xs text-[var(--to-ink-muted)]">
            Short forecast readiness • Routes / Hours / Units shown together • Option B coloring on the day pill
          </div>
        </div>
        <div className="text-xs text-[var(--to-ink-muted)]">Rolling view</div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const delta = d.delta_forecast;

          const onR = d.scheduled_routes;
          const onH = onR * 8;
          const onU = onR * 96;

          const qH = d.quota_hours;
          const qR = d.quota_routes;
          const qU = qH ? qH * 12 : null;

          const hc = d.total_headcount ? `${d.scheduled_techs}/${d.total_headcount}` : `${d.scheduled_techs}/—`;
          const util = d.util_pct === null ? "—" : `${d.util_pct}%`;

          return (
            <div key={d.date} className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div
                  title={tooltipForDay(d)}
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums border",
                    pillClassForDelta(delta),
                  ].join(" ")}
                >
                  <span>{mmdd(d.date)}</span>
                  <span className="text-[var(--to-ink-muted)] font-normal">{weekdayShort(d.date)}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px]">
                  {d.has_sv ? <span className="rounded px-1.5 py-0.5 border border-[var(--to-border)]">V</span> : null}
                  {d.has_check_in ? (
                    <span className="rounded px-1.5 py-0.5 border border-[var(--to-border)]">C</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 space-y-1 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[var(--to-ink-muted)]">On</span>
                  <span>
                    {onR}r • {onH}h • {onU}u
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--to-ink-muted)]">Quota</span>
                  <span>
                    {qR ?? "—"}r • {qH ?? "—"}h • {qU ?? "—"}u
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--to-ink-muted)]">Δ</span>
                  <span className="font-medium">{fmtSigned(delta)}</span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-[var(--to-ink-muted)]">HC</span>
                  <span>
                    {hc} <span className="text-[var(--to-ink-muted)]">({util})</span>
                  </span>
                </div>

                {delta === 0 ? (
                  <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">MEETS (no cushion)</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* 7-day summary */}
      <div className="mt-4 rounded-xl border border-[var(--to-border)] bg-[var(--to-surface-2)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">7-Day Summary</div>
            <div className="text-xs text-[var(--to-ink-muted)]">
              Totals across the rolling window • Utilization is weighted by headcount-days
            </div>
          </div>
          <div className="text-xs text-[var(--to-ink-muted)]">
            SV: {totals.sv_days}/{days.length} • CI: {totals.ci_days}/{days.length}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
            <div className="text-xs text-[var(--to-ink-muted)]">On (Total)</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {totals.scheduled_routes}r • {totals.scheduled_hours}h • {totals.scheduled_units}u
            </div>
          </div>

          <div className="rounded-lg border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
            <div className="text-xs text-[var(--to-ink-muted)]">Quota (Total)</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {totals.quota_routes}r • {totals.quota_hours}h • {totals.quota_units}u
            </div>
          </div>

          <div className="rounded-lg border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
            <div className="text-xs text-[var(--to-ink-muted)]">Δ (Total)</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{fmtSigned(totals.delta_routes)}</div>
            <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">
              (Computed on routes where quota exists)
            </div>
          </div>

          <div className="rounded-lg border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
            <div className="text-xs text-[var(--to-ink-muted)]">Utilization (7-day)</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{totalUtil}</div>
            <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">
              Σ scheduled techs / Σ headcount (by day)
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}