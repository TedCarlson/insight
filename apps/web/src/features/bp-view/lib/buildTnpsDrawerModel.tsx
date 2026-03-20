import KpiTrendChart from "@/features/metrics/scorecard/components/KpiTrendChart";
import MetricPeriodDetailTable from "../components/MetricPeriodDetailTable";
import type { BpRangeKey, BpViewRosterMetricCell } from "./bpView.types";

type TnpsPayload = {
  debug?: {
    selected_final_rows?: Array<{
      fiscal_end_date: string;
      metric_date: string;
      batch_id: string;
      rows_in_month: number;
      tnps_surveys: number | null;
      tnps_promoters: number | null;
      tnps_detractors: number | null;
    }>;
  };
  summary?: {
    tnps_score: number | null;
    total_surveys: number;
    total_promoters: number;
    total_detractors: number;
  };
} | null;

function fmtNum(value: number | null | undefined, decimals = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

function computeTnpsScore(
  surveys: number,
  promoters: number,
  detractors: number
): number | null {
  if (surveys > 0) return (100 * (promoters - detractors)) / surveys;
  return null;
}

function buildRangeTnpsValue(
  rows: Array<{
    tnps_surveys: number | null;
    tnps_promoters: number | null;
    tnps_detractors: number | null;
  }>
) {
  const surveys = rows.reduce((sum, row) => sum + (row.tnps_surveys ?? 0), 0);
  const promoters = rows.reduce((sum, row) => sum + (row.tnps_promoters ?? 0), 0);
  const detractors = rows.reduce((sum, row) => sum + (row.tnps_detractors ?? 0), 0);
  return fmtNum(computeTnpsScore(surveys, promoters, detractors), 2);
}

function buildTnpsMix(
  surveys: number,
  promoters: number,
  detractors: number
) {
  return {
    passive: Math.max(0, surveys - promoters - detractors),
  };
}

function bandLabel(bandKey: string) {
  if (bandKey === "EXCEEDS") return "Exceeds";
  if (bandKey === "MEETS") return "Meets";
  if (bandKey === "NEEDS_IMPROVEMENT") return "Needs Improvement";
  if (bandKey === "MISSES") return "Misses";
  return "No Data";
}

function bandAccent(bandKey: string) {
  if (bandKey === "EXCEEDS") return "var(--to-success)";
  if (bandKey === "MEETS") return "var(--to-primary)";
  if (bandKey === "NEEDS_IMPROVEMENT") return "var(--to-warning)";
  if (bandKey === "MISSES") return "var(--to-danger)";
  return "var(--to-border)";
}

function FaceIcon(props: { tone: "success" | "warning" | "danger" }) {
  const toneMap = {
    success: {
      stroke: "var(--to-success)",
      fill: "color-mix(in oklab, var(--to-success) 12%, white)",
    },
    warning: {
      stroke: "#eab308",
      fill: "color-mix(in oklab, #eab308 12%, white)",
    },
    danger: {
      stroke: "var(--to-danger)",
      fill: "color-mix(in oklab, var(--to-danger) 12%, white)",
    },
  } as const;

  const tone = toneMap[props.tone];

  return (
    <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="11" fill={tone.fill} stroke={tone.stroke} strokeWidth="1.7" />
      <circle cx="9.3" cy="10.4" r="1.1" fill={tone.stroke} />
      <circle cx="16.7" cy="10.4" r="1.1" fill={tone.stroke} />
      {props.tone === "success" ? (
        <path
          d="M8.5 15.1c1.2 1.4 2.8 2.1 4.5 2.1s3.3-.7 4.5-2.1"
          fill="none"
          stroke={tone.stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : null}
      {props.tone === "warning" ? (
        <path
          d="M9.2 15.8h7.6"
          fill="none"
          stroke={tone.stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : null}
      {props.tone === "danger" ? (
        <path
          d="M8.5 17c1.2-1.4 2.8-2.1 4.5-2.1s3.3.7 4.5 2.1"
          fill="none"
          stroke={tone.stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

function MixCard(props: {
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "danger";
}) {
  const toneMap = {
    success: {
      border: "var(--to-success)",
      bg: "color-mix(in oklab, var(--to-success) 7%, white)",
    },
    warning: {
      border: "#eab308",
      bg: "color-mix(in oklab, #eab308 7%, white)",
    },
    danger: {
      border: "var(--to-danger)",
      bg: "color-mix(in oklab, var(--to-danger) 7%, white)",
    },
  } as const;

  const numericValue =
    typeof props.value === "number" ? props.value : Number(props.value);

  const isZero = !numericValue;
  const effectiveTone = !isZero && props.tone ? toneMap[props.tone] : null;

  return (
    <div
      className="rounded-xl border px-2 py-2.5"
      style={{
        borderColor: effectiveTone?.border ?? "var(--to-border)",
        background: effectiveTone?.bg ?? "rgb(var(--muted) / 0.06)",
      }}
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-1.5">
          {effectiveTone ? <FaceIcon tone={props.tone!} /> : null}
          <div className="truncate text-[10px] font-medium tracking-wide text-muted-foreground">
            {props.label}
          </div>
        </div>

        <div className="text-center text-lg font-semibold leading-none text-foreground">
          {props.value}
        </div>
      </div>
    </div>
  );
}

export function buildTnpsDrawerModel(args: {
  metric: BpViewRosterMetricCell;
  personId: string;
  activeRange: BpRangeKey;
  tnpsPayload: TnpsPayload;
}) {
  const selectedRows = args.tnpsPayload?.debug?.selected_final_rows ?? [];

  const currentRows = selectedRows.slice(0, 1);
  const last3Rows = selectedRows.slice(0, 3);
  const last12Rows = selectedRows;

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: "Current FM", value: buildRangeTnpsValue(currentRows) },
  ];

  if (args.activeRange !== "FM") {
    summaryRows.push({ label: "Last 3 FM", value: buildRangeTnpsValue(last3Rows) });
  }

  if (args.activeRange === "12FM") {
    summaryRows.push({ label: "Last 12 FM", value: buildRangeTnpsValue(last12Rows) });
  }

  const totalSurveys = selectedRows.reduce((sum, row) => sum + (row.tnps_surveys ?? 0), 0);
  const totalPromoters = selectedRows.reduce((sum, row) => sum + (row.tnps_promoters ?? 0), 0);
  const totalDetractors = selectedRows.reduce((sum, row) => sum + (row.tnps_detractors ?? 0), 0);
  const totalScore = buildRangeTnpsValue(selectedRows);
  const mix = buildTnpsMix(totalSurveys, totalPromoters, totalDetractors);

  const periodRows = selectedRows.map((row) => {
    const score = fmtNum(
      computeTnpsScore(
        row.tnps_surveys ?? 0,
        row.tnps_promoters ?? 0,
        row.tnps_detractors ?? 0
      ),
      2
    );

    return {
      key: `${row.metric_date}-${row.batch_id}`,
      cells: [
        row.metric_date,
        score,
        row.tnps_surveys ?? "—",
        row.tnps_promoters ?? "—",
        row.tnps_detractors ?? "—",
      ],
    };
  });

  const periodFooter = {
    key: "footer",
    cells: [
      "TOTAL",
      totalScore,
      totalSurveys || "—",
      totalPromoters || "—",
      totalDetractors || "—",
    ],
  };

  return {
    title: args.metric.label,
    valueDisplay:
      args.tnpsPayload?.summary?.tnps_score != null
        ? fmtNum(args.tnpsPayload.summary.tnps_score, 2)
        : args.metric.value_display,
    bandLabel: bandLabel(args.metric.band_key),
    accentColor: bandAccent(args.metric.band_key),
    summaryRows,
    extraSections: [
      <div key="sentiment-mix" className="rounded-2xl border bg-muted/10 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Sentiment Mix
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <MixCard label="Surveys" value={totalSurveys || "—"} />
          <MixCard label="Pro" value={totalPromoters || 0} tone="success" />
          <MixCard label="Pass" value={mix.passive} tone="warning" />
          <MixCard label="Det" value={totalDetractors || 0} tone="danger" />
        </div>
      </div>,
    ],
    chart: (
      <KpiTrendChart
        kpiKey={args.metric.kpi_key}
        fiscalWindow={args.activeRange}
        personId={args.personId}
      />
    ),
    periodDetail: (
      <MetricPeriodDetailTable
        title="Period Detail"
        columns={[
          { key: "metric_date", label: "Metric Date" },
          { key: "tnps", label: "tNPS", align: "right", widthClass: "w-[80px]" },
          { key: "surveys", label: "Surveys", align: "right", widthClass: "w-[80px]" },
          { key: "promoters", label: "Prom", align: "right", widthClass: "w-[80px]" },
          { key: "detractors", label: "Detr", align: "right", widthClass: "w-[80px]" },
        ]}
        rows={periodRows}
        footer={periodFooter}
      />
    ),
  };
}