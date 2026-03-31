import type { ReactNode } from "react";
import type { KpiBandKey, MetricsRangeKey } from "@/shared/kpis/core/types";

export type WorkforceInspectionMetricFamily =
  | "tnps"
  | "ftr"
  | "tool_usage"
  | "met_rate"
  | "pure_pass"
  | "contact_48hr"
  | "repeat"
  | "rework"
  | "soi"
  | "unknown";

export type WorkforceInspectionSurface =
  | "role_company_supervisor"
  | "bp_view"
  | "unknown";

export type WorkforceInspectionTarget = {
  person_id: string;
  tech_id: string;
  full_name: string;
  context: string;
  contractor_name?: string | null;
  office_name?: string | null;
  leader_name?: string | null;
};

export type WorkforceInspectionSummaryRow = {
  label: string;
  value: string;
};

export type WorkforceInspectionTrendPoint = {
  label: string;
  value: number | null;
  is_period_final?: boolean;
  band_color?: string | null;
};

export type WorkforceInspectionPeriodColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  widthClass?: string;
};

export type WorkforceInspectionPeriodCell = string | number | null;

export type WorkforceInspectionPeriodRow = {
  key: string;
  cells: WorkforceInspectionPeriodCell[];
};

export type WorkforceInspectionPeriodFooter = {
  key: string;
  cells: WorkforceInspectionPeriodCell[];
};

export type WorkforceInspectionPeriodDetail = {
  title: string;
  columns: WorkforceInspectionPeriodColumn[];
  rows: WorkforceInspectionPeriodRow[];
  footer?: WorkforceInspectionPeriodFooter;
};

export type WorkforceInspectionFactRow = {
  label: string;
  value: string;
};

export type InspectionMetricCell = {
  kpi_key: string;
  label: string;
  value: number | null;
  value_display: string | null;
  band_key: KpiBandKey;
};

export type InspectionDrawerModel = {
  summaryRows: Array<{ label: string; value: string }>;
  chart: ReactNode;
  periodDetail?: ReactNode;
  extraSections?: ReactNode[];
};

export type InspectionHeaderModel = {
  title: string;
  valueDisplay: string | null;
  rangeLabel?: string | null;
};

export type InspectionSentimentModel = {
  kind: "tnps_sentiment";
  totalSurveys: number;
  totalPromoters: number;
  totalDetractors: number;
  title?: string;
};

export type InspectionTrendModel = {
  title?: string;
  subtitle?: string | null;
  badgeValue?: string | null;
  currentValue?: string | null;
  updatesCount?: number | null;
  monthsCount?: number | null;
  rangeLabel?: string | null;
  points: Array<{
    kpi_value: number | null;
    is_month_final: boolean;
    band_color?: string | null;
  }>;
};

export type InspectionPeriodTableModel = {
  title?: string;
  columns: WorkforceInspectionPeriodColumn[];
  rows: WorkforceInspectionPeriodRow[];
  footer?: WorkforceInspectionPeriodFooter | null;
};

export type InspectionRenderModel = {
  header: InspectionHeaderModel;
  sentiment?: InspectionSentimentModel | null;
  trend: InspectionTrendModel;
  periodDetail?: InspectionPeriodTableModel | null;
};

export type WorkforceInspectionPayload = {
  surface: WorkforceInspectionSurface;
  active_range: MetricsRangeKey;
  kpi_key: string;
  metric_family: WorkforceInspectionMetricFamily;

  target: WorkforceInspectionTarget;

  title: string;
  value: number | null;
  value_display: string | null;
  band_key: KpiBandKey;
  band_label: string;
  accent_color?: string | null;

  summary_rows: WorkforceInspectionSummaryRow[];
  trend_points: WorkforceInspectionTrendPoint[];
  period_detail?: WorkforceInspectionPeriodDetail | null;
  fact_rows?: WorkforceInspectionFactRow[];

  drawer_model?: InspectionDrawerModel | null;
  render_model?: InspectionRenderModel | null;
};