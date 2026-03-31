import type {
  WorkforceMetricCell,
  WorkforceRubricRow,
} from "@/shared/kpis/engine/workforceTypes";

export type WorkforceRankSeat = {
  rank: number;
  population: number;
};

export type WorkforceJobsBreakdown = {
  installs: number;
  tcs: number;
  sros: number;
  total: number;
};

export type WorkforceRosterColumn = {
  kpi_key: string;
  label: string;
};

export type WorkforceRosterRow = {
  person_id: string;
  tech_id: string;
  full_name: string;
  contractor_name?: string | null;
  team_class: string;
  rank_context?: {
    team: WorkforceRankSeat | null;
    region: WorkforceRankSeat | null;
    division?: WorkforceRankSeat | null;
  } | null;
  metrics: WorkforceMetricCell[];
  below_target_count: number;
  work_mix: WorkforceJobsBreakdown;
};

export type WorkforceMetricSelectTarget = {
  row: WorkforceRosterRow;
  column: WorkforceRosterColumn;
  metric: WorkforceMetricCell;
};

export type WorkforceHeaderCellProps = {
  column: WorkforceRosterColumn;
  rubric?: WorkforceRubricRow[];
  activeKey: string | null;
  setActiveKey: (value: string | null) => void;
  sectionStart?: boolean;
};

export type WorkforceMetricButtonCellProps = {
  metric?: WorkforceMetricCell;
  onClick?: () => void;
};

export type WorkforceJobsCellProps = {
  row: WorkforceRosterRow;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export type WorkforceIdentityCellProps = {
  row: WorkforceRosterRow;
};

export type WorkforceRubricPopoverProps = {
  label: string;
  rubric: WorkforceRubricRow[];
  onClose: () => void;
};

export type WorkforceWorkMixPopoverProps = {
  row: WorkforceRosterRow;
  onClose: () => void;
};

export type WorkforceRosterTableProps = {
  columns: WorkforceRosterColumn[];
  rows: WorkforceRosterRow[];
  rubricByKpi?: Map<string, WorkforceRubricRow[]>;
  activeKpiKey: string | null;
  setActiveKpiKey: (value: string | null) => void;
  activeWorkMixTechId: string | null;
  onToggleWorkMix: (techId: string) => void;
  onCloseAllOverlays: () => void;
  onMetricSelect: (
    row: WorkforceRosterRow,
    column: WorkforceRosterColumn,
    metric: WorkforceMetricCell
  ) => void;
};