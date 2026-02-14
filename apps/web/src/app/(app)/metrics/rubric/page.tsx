import { redirect } from "next/navigation";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
} from "@/components/ui/DataTable";
import { GLOBAL_BAND_PRESETS } from "@/features/metrics-admin/lib/globalBandPresets";
import type { BandKey } from "@/features/metrics-reports/lib/score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function Cell({
  span,
  children,
  align = "left",
  mono = false,
}: {
  span: number;
  children: any;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";

  return (
    <div
      className={[
        `col-span-${span}`,
        alignClass,
        mono ? "font-mono tabular-nums" : "",
        "min-w-0 truncate",
      ].join(" ")}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "").trim();
  if (!(h.length === 3 || h.length === 6)) return null;

  const full =
    h.length === 3
      ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
      : h;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isWhiteLike(bg: string) {
  const s = String(bg ?? "").trim().toLowerCase();
  return (
    s === "#fff" ||
    s === "#ffffff" ||
    s === "white" ||
    s === "rgb(255,255,255)" ||
    s === "rgb(255, 255, 255)"
  );
}

function BandChip({
  bandKey,
  valueText,
  preset,
}: {
  bandKey: BandKey;
  valueText: string;
  preset: Record<string, any>;
}) {
  const style = preset?.[bandKey] ?? preset?.NO_DATA ?? null;
  if (!style) {
    return (
      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold">
        {valueText}
      </span>
    );
  }

  const bg = String(style.bg_color ?? "");
  const border = String(style.border_color ?? "");
  const text = String(style.text_color ?? "");

  let surface = bg;
  if (isWhiteLike(bg)) {
    const tinted = hexToRgba(border, 0.12);
    if (tinted) surface = tinted;
  } else {
    const softened = hexToRgba(bg, 0.92);
    if (softened) surface = softened;
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-md border px-2 py-[2px] text-[11px] font-semibold leading-none shadow-[0_1px_0_rgba(0,0,0,0.03)]"
      style={{
        backgroundColor: surface,
        color: text,
        borderColor: border,
      }}
    >
      {valueText}
    </span>
  );
}

function BandLegend({ preset }: { preset: Record<string, any> }) {
  const keys: BandKey[] = ["EXCEEDS", "MEETS", "NEEDS_IMPROVEMENT", "MISSES", "NO_DATA"];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <div className="text-xs font-medium text-[var(--to-ink-muted)]">{k}</div>
          <BandChip bandKey={k} valueText="Sample" preset={preset} />
        </div>
      ))}
    </div>
  );
}

function isRowMeaningful(r: any) {
  // “Meaningful” = at least one of min/max/score is present.
  return r.min_value != null || r.max_value != null || r.score_value != null;
}

export default async function MetricsRubricPage() {
  const scopeAuth = await requireSelectedPcOrgServer();
  if (!scopeAuth.ok) redirect("/home");

  const admin = supabaseAdmin();

  const presetKeys = Object.keys(GLOBAL_BAND_PRESETS);

  const { data: sel } = await admin
    .from("metrics_band_style_selection")
    .select("preset_key,selection_key")
    .eq("selection_key", "GLOBAL")
    .maybeSingle();

  const activeKey =
    sel?.preset_key && presetKeys.includes(sel.preset_key)
      ? sel.preset_key
      : presetKeys[0] ?? "MODERN";

  const activePreset =
    GLOBAL_BAND_PRESETS[activeKey] ?? GLOBAL_BAND_PRESETS[presetKeys[0] ?? "MODERN"];

  const { data: rubricRows, error } = await admin
    .from("metrics_class_kpi_rubric")
    .select("class_type,kpi_key,band_key,min_value,max_value,score_value")
    .eq("class_type", "P4P")
    .order("kpi_key", { ascending: true })
    .order("band_key", { ascending: true });

  // ✅ Filter out KPI groups where ALL rows are empty (min/max/score null)
  const rows = rubricRows ?? [];
  const byKpi = new Map<string, any[]>();
  for (const r of rows) {
    const k = String(r.kpi_key);
    const arr = byKpi.get(k) ?? [];
    arr.push(r);
    byKpi.set(k, arr);
  }

  const filtered: any[] = [];
  for (const [k, group] of byKpi.entries()) {
    const keepGroup = group.some(isRowMeaningful);
    if (!keepGroup) continue;
    filtered.push(...group);
  }

  return (
    <PageShell>
      <PageHeader title="Rubric & Band Styles" subtitle="P4P rubric rows + active band preset" />

      <Card>
        <div className="text-sm font-medium">
          Active preset (DB): <span className="font-mono">{activeKey}</span>
        </div>
        <div className="mt-3">
          <BandLegend preset={activePreset} />
        </div>
      </Card>

      {error ? (
        <Card>
          <div className="text-sm text-red-600 font-medium">Failed to load rubric</div>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="text-sm font-medium">
              Rubric rows (P4P): {filtered.length}
            </div>
            <div className="text-xs text-[var(--to-ink-muted)]">
              Hiding KPI groups with all NULL min/max/score.
            </div>
          </div>

          <DataTable zebra hover layout="fixed">
            <DataTableHeader>
              <Cell span={3}>kpi_key</Cell>
              <Cell span={2}>band_key</Cell>
              <Cell span={2} align="right" mono>
                min
              </Cell>
              <Cell span={2} align="right" mono>
                max
              </Cell>
              <Cell span={3} align="right" mono>
                score
              </Cell>
            </DataTableHeader>

            <DataTableBody zebra>
              {filtered.map((r: any, idx: number) => (
                <DataTableRow key={`${r.kpi_key}-${r.band_key}-${idx}`}>
                  <Cell span={3} mono>
                    {r.kpi_key}
                  </Cell>
                  <Cell span={2}>{r.band_key}</Cell>
                  <Cell span={2} align="right" mono>
                    {r.min_value ?? "—"}
                  </Cell>
                  <Cell span={2} align="right" mono>
                    {r.max_value ?? "—"}
                  </Cell>
                  <Cell span={3} align="right" mono>
                    {r.score_value ?? "—"}
                  </Cell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>
      )}
    </PageShell>
  );
}