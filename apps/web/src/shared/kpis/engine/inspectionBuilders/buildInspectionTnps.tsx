import type { InspectionRenderModel } from "@/shared/kpis/contracts/inspectionTypes";
import type { MetricsRangeKey } from "@/shared/kpis/core/types";
import { aggregateTnps } from "@/shared/kpis/core/aggregateTnps";

function fmtNum(value: number | null | undefined, decimals = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

function mapRangeLabel(activeRange: MetricsRangeKey): string {
  if (activeRange === "FM") return "Current FM";
  if (activeRange === "PREVIOUS") return "Previous FM";
  if (activeRange === "3FM") return "Last 3 FM";
  if (activeRange === "12FM") return "Last 12 FM";
  return String(activeRange);
}

export function buildInspectionTnps(args: {
  payload: any;
  activeRange: MetricsRangeKey;
}): InspectionRenderModel {
  const selectedRows = args.payload?.debug?.selected_final_rows ?? [];
  const trend = args.payload?.debug?.trend ?? args.payload?.trend ?? [];

  const currentRows = selectedRows.slice(0, 1);
  const previousRows = selectedRows.slice(0, 1);
  const last3Rows = selectedRows.slice(0, 3);
  const last12Rows = selectedRows.slice(0, 12);

  let headlineValue: string = "—";

  if (args.activeRange === "FM") {
    headlineValue = fmtNum(aggregateTnps(currentRows).tnps_score, 2);
  } else if (args.activeRange === "PREVIOUS") {
    headlineValue = fmtNum(aggregateTnps(previousRows).tnps_score, 2);
  } else if (args.activeRange === "3FM") {
    headlineValue = fmtNum(aggregateTnps(last3Rows).tnps_score, 2);
  } else if (args.activeRange === "12FM") {
    headlineValue = fmtNum(aggregateTnps(last12Rows).tnps_score, 2);
  }

  const totals = aggregateTnps(selectedRows);

  const totalSurveys = totals.tnps_surveys ?? 0;
  const totalPromoters = totals.tnps_promoters ?? 0;
  const totalDetractors = totals.tnps_detractors ?? 0;
  const totalScore = fmtNum(totals.tnps_score, 2);

  const trendPoints = trend.map((row: any) => ({
    kpi_value: row.kpi_value ?? null,
    is_month_final: !!row.is_month_final,
    band_color:
      row.kpi_value != null && row.kpi_value >= 90
        ? "#22c55e"
        : row.kpi_value != null && row.kpi_value >= 70
          ? "#eab308"
          : row.kpi_value != null
            ? "#ef4444"
            : null,
  }));

  const periodRows = selectedRows.map((row: any) => {
    const score = fmtNum(
      aggregateTnps([
        {
          tnps_surveys: row.tnps_surveys,
          tnps_promoters: row.tnps_promoters,
          tnps_detractors: row.tnps_detractors,
        },
      ]).tnps_score,
      2
    );

    return {
      key: `${row.metric_date}-${row.batch_id ?? "no-batch"}`,
      cells: [
        row.metric_date ?? "—",
        score,
        row.tnps_surveys ?? "—",
        row.tnps_promoters ?? "—",
        row.tnps_detractors ?? "—",
      ],
    };
  });

  return {
    header: {
      title: "tNPS",
      valueDisplay: headlineValue,
      rangeLabel: mapRangeLabel(args.activeRange),
    },
    sentiment: {
      kind: "tnps_sentiment",
      totalSurveys,
      totalPromoters,
      totalDetractors,
      title: "Sentiment Mix",
    },
    trend: {
      title: "Trend",
      subtitle: "Checkpoint progression in selected window",
      badgeValue: totalScore,
      currentValue: totalScore,
      updatesCount: trend.length,
      monthsCount:
        args.payload?.debug?.selected_month_count ??
        args.payload?.debug?.distinct_fiscal_month_count ??
        null,
      rangeLabel: mapRangeLabel(args.activeRange),
      points: trendPoints,
    },
    periodDetail: {
      title: "Period Detail",
      columns: [
        { key: "metric_date", label: "Metric Date" },
        {
          key: "tnps",
          label: "tNPS",
          align: "right",
          widthClass: "w-[80px]",
        },
        {
          key: "surveys",
          label: "Surveys",
          align: "right",
          widthClass: "w-[80px]",
        },
        {
          key: "prom",
          label: "Prom",
          align: "right",
          widthClass: "w-[80px]",
        },
        {
          key: "det",
          label: "Detr",
          align: "right",
          widthClass: "w-[80px]",
        },
      ],
      rows: periodRows,
      footer: {
        key: "footer",
        cells: [
          "TOTAL",
          totalScore,
          totalSurveys || "—",
          totalPromoters || "—",
          totalDetractors || "—",
        ],
      },
    },
  };
}