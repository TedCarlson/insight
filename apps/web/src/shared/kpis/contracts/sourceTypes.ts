import type { RawMetricPayload } from "./kpiTypes";

export type MetricsAtomicRow = {
  id?: string;
  batch_id: string;
  pc_org_id: string;
  metric_date: string;
  fiscal_end_date: string;
  tech_id: string;
  unique_row_key: string;
  raw: RawMetricPayload;
  inserted_at?: string;
};

export type MetricsTotalRow = {
  id?: string;
  batch_id: string;
  pc_org_id: string;
  metric_date: string;
  fiscal_end_date: string;
  summary_type: string;
  summary_key: string;
  summary_label: string;
  unique_row_key: string;
  raw: RawMetricPayload;
  inserted_at?: string;
};

export type MetricsBatchRef = {
  batch_id: string;
  pc_org_id: string;
  metric_date: string;
  fiscal_end_date: string;
  inserted_at?: string;
};

export type MetricsSourceBundle = {
  batch: MetricsBatchRef | null;
  atomic_rows: MetricsAtomicRow[];
  total_rows: MetricsTotalRow[];
};

export type AtomicRowLookupArgs = {
  pc_org_id: string;
  fiscal_end_date: string;
  tech_ids?: string[];
};

export type TotalRowLookupArgs = {
  pc_org_id: string;
  fiscal_end_date: string;
  summary_type: string;
  summary_key?: string;
};

export type LatestBatchLookupArgs = {
  pc_org_id: string;
  fiscal_end_date?: string;
};

export type SourceQueryContext = {
  pc_org_id: string;
  fiscal_end_date: string;
  batch_id?: string;
};