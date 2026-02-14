export type KpiDef = {
  /** stable internal key used by slicer */
  key: string;
  /** column label in UI */
  label: string;
  /** row field holding the numeric value */
  valueField: string;
  /** row field holding the rubric band key (computed server-side) */
  bandField: string;
};

export const P4P_KPIS: KpiDef[] = [
  { key: "TNPS", label: "tNPS", valueField: "tnps_score", bandField: "__tnps_band_key" },
  { key: "FTR", label: "FTR", valueField: "ftr_rate", bandField: "__ftr_band_key" },
  { key: "TOOL_USAGE", label: "Tool Usage", valueField: "tool_usage_rate", bandField: "__tool_band_key" },
];