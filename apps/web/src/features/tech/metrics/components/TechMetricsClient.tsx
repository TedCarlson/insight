"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { ScorecardTile } from "@/features/metrics/scorecard/lib/scorecard.types";
import { mapTilesWithPreset } from "@/features/tech/metrics/lib/mapTilesWithPreset";
import MetricInspectorDrawer from "./MetricInspectorDrawer";
import TnpsInspectorDrawer from "./TnpsInspectorDrawer";
import { buildFtrDrawerModel, type FtrDebug } from "@/features/tech/metrics/lib/buildFtrDrawerModel";
import {
  buildToolUsageDrawerModel,
  type ToolUsageDebug,
} from "@/features/tech/metrics/lib/buildToolUsageDrawerModel";
import {
  buildPurePassDrawerModel,
  type PurePassDebug,
} from "@/features/tech/metrics/lib/buildPurePassDrawerModel";
import {
  build48HrDrawerModel,
  type Callback48HrDebug,
} from "@/features/tech/metrics/lib/build48HrDrawerModel";
import {
  buildRepeatDrawerModel,
  type RepeatDebug,
} from "@/features/tech/metrics/lib/buildRepeatDrawerModel";
import {
  buildSoiDrawerModel,
  type SoiDebug,
} from "@/features/tech/metrics/lib/buildSoiDrawerModel";
import {
  buildReworkDrawerModel,
  type ReworkDebug,
} from "@/features/tech/metrics/lib/buildReworkDrawerModel";
import {
  buildMetDrawerModel,
  type MetDebug,
} from "@/features/tech/metrics/lib/buildMetDrawerModel";

type RangeKey = "FM" | "3FM" | "12FM";
type Tile = ScorecardTile;

type TnpsDebug = {
  requested_range: string;
  distinct_fiscal_month_count: number;
  distinct_fiscal_months_found: string[];
  selected_month_count: number;
  selected_final_rows: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    rows_in_month: number;
    tnps_surveys: number | null;
    tnps_promoters: number | null;
    tnps_detractors: number | null;
  }>;
};

type TnpsTileContext = {
  sample_short?: number | null;
  sample_long?: number | null;
  detractors?: number | null;
  meets_min_volume?: boolean | null;
} | null;

function InlineSpinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function RangeChip(props: {
  label: string;
  active: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.pending}
      className={[
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-xs font-medium transition active:scale-[0.98]",
        props.active
          ? "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)]"
          : "bg-muted/20 text-muted-foreground",
        props.pending ? "opacity-90" : "",
      ].join(" ")}
    >
      {props.pending ? <InlineSpinner /> : null}
      <span>{props.label}</span>
    </button>
  );
}

function isTnpsKey(kpiKey: string) {
  return kpiKey.toLowerCase().includes("tnps");
}

function isToolUsageKey(kpiKey: string) {
  const k = kpiKey.toLowerCase();
  return k.includes("tool_usage") || k.includes("toolusage") || k.includes("tu_rate");
}

function isPurePassKey(kpiKey: string) {
  const k = kpiKey.toLowerCase();
  return k.includes("pure_pass") || k.includes("purepass") || k.includes("pht_pure_pass");
}

function is48HrKey(kpiKey: string) {
  const k = kpiKey.toLowerCase();
  return k.includes("48hr") || k.includes("48_hr") || k.includes("callback");
}

function isRepeatKey(kpiKey: string) {
  return kpiKey.toLowerCase().includes("repeat");
}

function isSoiKey(kpiKey: string) {
  return kpiKey.toLowerCase().includes("soi");
}

function isReworkKey(kpiKey: string) {
  return kpiKey.toLowerCase().includes("rework");
}

function isMetKey(kpiKey: string) {
  const k = kpiKey.toLowerCase();
  return k === "met_rate" || k === "met" || k.includes("metrate");
}

function formatTnpsSupportLine(tile: Tile): string | null {
  const ctx = tile.context as TnpsTileContext;
  const surveys = ctx?.sample_short ?? 0;
  const promoters = ctx?.sample_long ?? 0;
  const detractors = ctx?.detractors ?? 0;

  if (!surveys || surveys <= 0) return null;

  const passive = Math.max(0, surveys - promoters - detractors);
  const parts: string[] = [];

  if (promoters > 0) parts.push(`${promoters} Pro`);
  if (passive > 0) parts.push(`${passive} Pass`);
  if (detractors > 0) parts.push(`${detractors} Det`);

  return parts.length ? parts.join(" • ") : null;
}

function formatSupportLine(tile: Tile): string | null {
  if (tile.kpi_key === "ftr_rate") {
    const jobs = tile.context?.sample_short;
    const fails = tile.context?.sample_long;
    const left = jobs ? `${Math.round(jobs)} FTR jobs` : null;
    const right = fails ? `${Math.round(fails)} fails` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (isToolUsageKey(tile.kpi_key)) {
    const eligible = tile.context?.sample_short;
    const compliant = tile.context?.sample_long;
    const left = eligible ? `${Math.round(eligible)} eligible` : null;
    const right = compliant ? `${Math.round(compliant)} compliant` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (isPurePassKey(tile.kpi_key)) {
    const jobs = tile.context?.sample_short;
    const purePass = tile.context?.sample_long;
    const left = jobs ? `${Math.round(jobs)} PHT jobs` : null;
    const right = purePass ? `${Math.round(purePass)} pure pass` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (is48HrKey(tile.kpi_key)) {
    const orders = tile.context?.sample_short;
    const eligible = tile.context?.sample_long;
    const left = orders ? `${Math.round(orders)} orders` : null;
    const right = eligible ? `${Math.round(eligible)} eligible` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (isRepeatKey(tile.kpi_key)) {
    const repeats = tile.context?.sample_short;
    const tcs = tile.context?.sample_long;
    const left = repeats ? `${Math.round(repeats)} repeats` : null;
    const right = tcs ? `${Math.round(tcs)} TCs` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (isSoiKey(tile.kpi_key)) {
    const soi = tile.context?.sample_short;
    const installs = tile.context?.sample_long;
    const left = soi ? `${Math.round(soi)} SOI` : null;
    const right = installs ? `${Math.round(installs)} installs` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (isReworkKey(tile.kpi_key)) {
    const rework = tile.context?.sample_short;
    const appts = tile.context?.sample_long;
    const left = rework ? `${Math.round(rework)} rework` : null;
    const right = appts ? `${Math.round(appts)} appts` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (isMetKey(tile.kpi_key)) {
    const met = tile.context?.sample_short;
    const appts = tile.context?.sample_long;
    const left = met ? `${Math.round(met)} met` : null;
    const right = appts ? `${Math.round(appts)} appts` : null;
    return [left, right].filter(Boolean).join(" • ") || null;
  }

  if (isTnpsKey(tile.kpi_key)) {
    return formatTnpsSupportLine(tile);
  }

  return null;
}

function MetricCard(props: { tile: Tile; onOpen: () => void }) {
  const supportLine = formatSupportLine(props.tile);
  const borderColor = props.tile.band.paint?.border ?? "var(--to-border)";
  const topBarColor = props.tile.band.paint?.border ?? "var(--to-border)";

  return (
    <button
      type="button"
      onClick={props.onOpen}
      className="w-full overflow-hidden rounded-2xl border bg-card text-left active:scale-[0.99]"
      style={{ borderColor }}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: topBarColor }} />

      <div className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {props.tile.label}
        </div>

        <div className="mt-1 text-xl font-semibold leading-none">
          {props.tile.value_display ?? "—"}
        </div>

        <div className="mt-1 text-sm text-muted-foreground">
          {props.tile.band.label}
        </div>

        {supportLine ? (
          <div className="mt-1 text-xs text-muted-foreground">{supportLine}</div>
        ) : null}
      </div>
    </button>
  );
}

export default function TechMetricsClient(props: {
  initialRange: RangeKey;
  tiles: Tile[];
  activePresetKey: string | null;
  ftrDebug: FtrDebug;
  tnpsDebug?: TnpsDebug;
  toolUsageDebug?: ToolUsageDebug;
  purePassDebug?: PurePassDebug;
  callback48HrDebug?: Callback48HrDebug;
  repeatDebug?: RepeatDebug;
  soiDebug?: SoiDebug;
  reworkDebug?: ReworkDebug;
  metDebug?: MetDebug;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingRange, setPendingRange] = useState<RangeKey | null>(null);

  const urlRangeRaw = String(searchParams.get("range") ?? props.initialRange ?? "FM").toUpperCase();

  const activeRangeFromUrl: RangeKey =
    urlRangeRaw === "3FM" ? "3FM" : urlRangeRaw === "12FM" ? "12FM" : "FM";

  const optimisticRange: RangeKey =
    isPending && pendingRange ? pendingRange : activeRangeFromUrl;

  function onSelectRange(next: RangeKey) {
    if (next === activeRangeFromUrl) return;
    setPendingRange(next);
    startTransition(() => {
      router.push(`/tech/metrics?range=${next}`);
    });
  }

  const tiles = useMemo(
    () => mapTilesWithPreset(props.tiles, props.activePresetKey),
    [props.tiles, props.activePresetKey]
  );

  const [openMetricKey, setOpenMetricKey] = useState<string | null>(null);

  const openTile = useMemo(
    () => tiles.find((t) => t.kpi_key === openMetricKey) ?? null,
    [openMetricKey, tiles]
  );

  const ftrDrawerModel = useMemo(() => {
    if (!openTile || openTile.kpi_key !== "ftr_rate") return null;
    return buildFtrDrawerModel({
      tile: openTile,
      ftrDebug: props.ftrDebug,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.ftrDebug, activeRangeFromUrl]);

  const toolUsageDrawerModel = useMemo(() => {
    if (!openTile || !isToolUsageKey(openTile.kpi_key)) return null;
    return buildToolUsageDrawerModel({
      tile: openTile,
      toolUsageDebug: props.toolUsageDebug ?? null,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.toolUsageDebug, activeRangeFromUrl]);

  const purePassDrawerModel = useMemo(() => {
    if (!openTile || !isPurePassKey(openTile.kpi_key)) return null;
    return buildPurePassDrawerModel({
      tile: openTile,
      purePassDebug: props.purePassDebug ?? null,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.purePassDebug, activeRangeFromUrl]);

  const callback48HrDrawerModel = useMemo(() => {
    if (!openTile || !is48HrKey(openTile.kpi_key)) return null;
    return build48HrDrawerModel({
      tile: openTile,
      callback48HrDebug: props.callback48HrDebug ?? null,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.callback48HrDebug, activeRangeFromUrl]);

  const repeatDrawerModel = useMemo(() => {
    if (!openTile || !isRepeatKey(openTile.kpi_key)) return null;
    return buildRepeatDrawerModel({
      tile: openTile,
      repeatDebug: props.repeatDebug ?? null,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.repeatDebug, activeRangeFromUrl]);

  const soiDrawerModel = useMemo(() => {
    if (!openTile || !isSoiKey(openTile.kpi_key)) return null;
    return buildSoiDrawerModel({
      tile: openTile,
      soiDebug: props.soiDebug ?? null,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.soiDebug, activeRangeFromUrl]);

  const reworkDrawerModel = useMemo(() => {
    if (!openTile || !isReworkKey(openTile.kpi_key)) return null;
    return buildReworkDrawerModel({
      tile: openTile,
      reworkDebug: props.reworkDebug ?? null,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.reworkDebug, activeRangeFromUrl]);

  const metDrawerModel = useMemo(() => {
    if (!openTile || !isMetKey(openTile.kpi_key)) return null;
    return buildMetDrawerModel({
      tile: openTile,
      metDebug: props.metDebug ?? null,
      activeRange: activeRangeFromUrl,
    });
  }, [openTile, props.metDebug, activeRangeFromUrl]);

  const isFtrOpen = openTile?.kpi_key === "ftr_rate";
  const isTnpsOpen = !!openTile && isTnpsKey(openTile.kpi_key);
  const isToolUsageOpen = !!openTile && isToolUsageKey(openTile.kpi_key);
  const isPurePassOpen = !!openTile && isPurePassKey(openTile.kpi_key);
  const is48HrOpen = !!openTile && is48HrKey(openTile.kpi_key);
  const isRepeatOpen = !!openTile && isRepeatKey(openTile.kpi_key);
  const isSoiOpen = !!openTile && isSoiKey(openTile.kpi_key);
  const isReworkOpen = !!openTile && isReworkKey(openTile.kpi_key);
  const isMetOpen = !!openTile && isMetKey(openTile.kpi_key);

  return (
    <>
      <section className="rounded-2xl border bg-card p-3">
        <div className="grid grid-cols-3 gap-2">
          <RangeChip
            label="Current FM"
            active={optimisticRange === "FM"}
            pending={isPending && pendingRange === "FM"}
            onClick={() => onSelectRange("FM")}
          />
          <RangeChip
            label="Last 3 FM"
            active={optimisticRange === "3FM"}
            pending={isPending && pendingRange === "3FM"}
            onClick={() => onSelectRange("3FM")}
          />
          <RangeChip
            label="Last 12 FM"
            active={optimisticRange === "12FM"}
            pending={isPending && pendingRange === "12FM"}
            onClick={() => onSelectRange("12FM")}
          />
        </div>
      </section>

      <section className={`space-y-3 ${isPending ? "opacity-85" : ""}`}>
        {tiles.map((tile) => (
          <MetricCard
            key={tile.kpi_key}
            tile={tile}
            onOpen={() => setOpenMetricKey(tile.kpi_key)}
          />
        ))}
      </section>

      <MetricInspectorDrawer
        open={!!openTile && isFtrOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={ftrDrawerModel?.summaryRows ?? []}
        chart={ftrDrawerModel?.chart ?? null}
        periodDetail={ftrDrawerModel?.periodDetail ?? null}
      />

      <MetricInspectorDrawer
        open={!!openTile && isToolUsageOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={toolUsageDrawerModel?.summaryRows ?? []}
        chart={toolUsageDrawerModel?.chart ?? null}
        periodDetail={toolUsageDrawerModel?.periodDetail ?? null}
      />

      <MetricInspectorDrawer
        open={!!openTile && isPurePassOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={purePassDrawerModel?.summaryRows ?? []}
        chart={purePassDrawerModel?.chart ?? null}
        periodDetail={purePassDrawerModel?.periodDetail ?? null}
      />

      <MetricInspectorDrawer
        open={!!openTile && is48HrOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={callback48HrDrawerModel?.summaryRows ?? []}
        chart={callback48HrDrawerModel?.chart ?? null}
        periodDetail={callback48HrDrawerModel?.periodDetail ?? null}
      />

      <MetricInspectorDrawer
        open={!!openTile && isRepeatOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={repeatDrawerModel?.summaryRows ?? []}
        chart={repeatDrawerModel?.chart ?? null}
        periodDetail={repeatDrawerModel?.periodDetail ?? null}
      />

      <MetricInspectorDrawer
        open={!!openTile && isSoiOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={soiDrawerModel?.summaryRows ?? []}
        chart={soiDrawerModel?.chart ?? null}
        periodDetail={soiDrawerModel?.periodDetail ?? null}
      />

      <MetricInspectorDrawer
        open={!!openTile && isReworkOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={reworkDrawerModel?.summaryRows ?? []}
        chart={reworkDrawerModel?.chart ?? null}
        periodDetail={reworkDrawerModel?.periodDetail ?? null}
      />

      <MetricInspectorDrawer
        open={!!openTile && isMetOpen}
        title={openTile?.label ?? ""}
        valueDisplay={openTile?.value_display ?? null}
        bandLabel={openTile?.band.label ?? ""}
        accentColor={openTile?.band.paint?.border}
        onClose={() => setOpenMetricKey(null)}
        summaryRows={metDrawerModel?.summaryRows ?? []}
        chart={metDrawerModel?.chart ?? null}
        periodDetail={metDrawerModel?.periodDetail ?? null}
      />

      <TnpsInspectorDrawer
        open={!!openTile && isTnpsOpen}
        tile={openTile}
        onClose={() => setOpenMetricKey(null)}
        activeRange={activeRangeFromUrl}
        tnpsDebug={props.tnpsDebug}
      />
    </>
  );
}