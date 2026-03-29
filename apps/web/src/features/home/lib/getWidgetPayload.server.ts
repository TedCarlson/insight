import { supabaseAdmin } from "@/shared/data/supabase/admin";

import {
  getCompanySupervisorViewPayload,
} from "@/features/company-supervisor-view/lib/getCompanySupervisorViewPayload.server";
import {
  getCompanyManagerViewPayload,
} from "@/features/company-manager/lib/getCompanyManagerViewPayload.server";
import type {
  CompanySupervisorRosterRow,
} from "@/features/company-supervisor-view/lib/companySupervisorView.types";
import {
  resolveCompanySupervisorScope,
} from "@/features/company-supervisor-view/lib/resolveCompanySupervisorScope.server";

export type WorkspaceRole =
  | "APP_OWNER"
  | "ADMIN"
  | "TECH"
  | "BP_SUPERVISOR"
  | "BP_LEAD"
  | "BP_OWNER"
  | "ITG_SUPERVISOR"
  | "COMPANY_MANAGER"
  | "UNSCOPED"
  | "UNKNOWN";

export type PulseMetric = {
  value: number | null;
  display: string;
  note: string;
};

export type OfficePulseItem = {
  label: string;
  status: string;
  risk: string;
};

export type FeedItem = {
  type: "Dispatch" | "Field Log" | "Broadcast" | "Uploads";
  title: string;
  detail: string;
  when: string;
  meta?: string | null;
};

export type UploadStatusItem = {
  title: string;
  lastRun: string;
  actor: string;
  href?: string;
};

export type BroadcastReachSummary = {
  reachChip: string | null;
  activeBroadcast: string;
  audience: string;
  seen: string;
  unread: string;
};

export type SupervisorPulseRowMetric = {
  kpi_key: "tnps" | "ftr" | "toolUsage";
  value: number | null;
  band_key?: string | null;
};

export type SupervisorPulseRow = {
  kind: "team_total" | "itg_supervisor_total" | "bp_supervisor";
  label: string;
  hc: number;
  metrics: [
    SupervisorPulseRowMetric,
    SupervisorPulseRowMetric,
    SupervisorPulseRowMetric,
  ];
};

export type WidgetPayload = {
  pulse: {
    org: {
      tnps: PulseMetric;
      ftr: PulseMetric;
      toolUsage: PulseMetric;
    };
    offices: OfficePulseItem[];
  };
  supervisorPulse: {
    rows: SupervisorPulseRow[];
  };
  feed: {
    items: FeedItem[];
  };
  uploads: {
    items: UploadStatusItem[];
  };
  broadcast: {
    reach: BroadcastReachSummary;
  };
};

type Args = {
  role: WorkspaceRole;
  selectedPcOrgId: string | null;
  viewerFullName?: string | null;
};

type UploadSnapshotRow = {
  batch_id?: string | null;
  created_at?: string | null;
};

type MetricSurfaceRow = {
  kpi_key?: string | null;
  value?: number | null;
};

type RosterColumn = {
  kpi_key: string;
  label: string;
};

type ManagerKpiStripItem = {
  kpi_key?: string | null;
  value?: number | null;
  band_key?: string | null;
};

function emptyMetric(note: string): PulseMetric {
  return {
    value: null,
    display: "—",
    note,
  };
}

function formatPercentLike(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}`;
}

function formatRelativeWhen(value: string | null | undefined): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Now";
  if (diffMin < 60) return `${diffMin}m`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

function normalizeMetricTriplet(rows: MetricSurfaceRow[]) {
  let tnps: number | null = null;
  let ftr: number | null = null;
  let toolUsage: number | null = null;

  for (const row of rows) {
    const key = String(row.kpi_key ?? "").trim().toLowerCase();
    const value =
      typeof row.value === "number" && Number.isFinite(row.value)
        ? row.value
        : null;

    if (key === "tnps" || key === "tnps_score") {
      tnps = value;
    } else if (key === "ftr" || key === "ftr_rate") {
      ftr = value;
    } else if (
      key === "tool_usage" ||
      key === "tool_usage_rate" ||
      key === "toolusage"
    ) {
      toolUsage = value;
    }
  }

  return { tnps, ftr, toolUsage };
}

async function resolveOrgMetricValues(
  admin: ReturnType<typeof supabaseAdmin>,
  selectedPcOrgId: string
) {
  try {
    const { data } = await admin
      .from("metrics_org_kpi_surface_v")
      .select("kpi_key,value")
      .eq("pc_org_id", selectedPcOrgId);

    return normalizeMetricTriplet((data ?? []) as MetricSurfaceRow[]);
  } catch {
    return {
      tnps: null,
      ftr: null,
      toolUsage: null,
    };
  }
}

async function resolveManagerPulse(
  admin: ReturnType<typeof supabaseAdmin>,
  selectedPcOrgId: string
): Promise<WidgetPayload["pulse"]> {
  const values = await resolveOrgMetricValues(admin, selectedPcOrgId);

  return {
    org: {
      tnps: {
        value: values.tnps,
        display: formatPercentLike(values.tnps),
        note: "Primary org pulse KPI",
      },
      ftr: {
        value: values.ftr,
        display: formatPercentLike(values.ftr),
        note: "Primary org pulse KPI",
      },
      toolUsage: {
        value: values.toolUsage,
        display: formatPercentLike(values.toolUsage),
        note: "Primary org pulse KPI",
      },
    },
    offices: [
      { label: "Office 1", status: "Pending", risk: "—" },
      { label: "Office 2", status: "Pending", risk: "—" },
    ],
  };
}

function buildBaseFeedItemsWithoutUploads(): FeedItem[] {
  return [
    {
      type: "Dispatch",
      title: "Dispatch Console",
      detail: "Most recent dispatch activity will appear here.",
      when: "Pending",
    },
    {
      type: "Field Log",
      title: "Review Queue",
      detail: "Review queue and latest field-log events will appear here.",
      when: "Pending",
    },
    {
      type: "Broadcast",
      title: "Broadcast Activity",
      detail: "Latest manager bulletin activity will appear here.",
      when: "Pending",
      meta: "R: 43/63",
    },
  ];
}

async function resolveUploadFeedItems(
  admin: ReturnType<typeof supabaseAdmin>,
  selectedPcOrgId: string
): Promise<FeedItem[]> {
  try {
    const { data } = await admin
      .from("master_kpi_archive_snapshot")
      .select("batch_id,created_at")
      .eq("pc_org_id", selectedPcOrgId)
      .order("created_at", { ascending: false })
      .limit(4);

    const rows = (data ?? []) as UploadSnapshotRow[];
    if (!rows.length) return [];

    const deduped = new Set<string>();
    const items: FeedItem[] = [];

    for (const row of rows) {
      const batchId = String(row.batch_id ?? "").trim();
      const createdAt = row.created_at ?? null;
      const dedupeKey = batchId || String(createdAt ?? "");

      if (!dedupeKey || deduped.has(dedupeKey)) continue;
      deduped.add(dedupeKey);

      items.push({
        type: "Uploads",
        title: "Metrics Upload",
        detail: batchId
          ? `Batch ${batchId} processed`
          : "Metrics upload processed",
        when: formatRelativeWhen(createdAt),
      });
    }

    return items;
  } catch {
    return [];
  }
}

async function resolveManagerFeed(
  admin: ReturnType<typeof supabaseAdmin>,
  selectedPcOrgId: string
): Promise<FeedItem[]> {
  const uploadItems = await resolveUploadFeedItems(admin, selectedPcOrgId);
  const baseItems = buildBaseFeedItemsWithoutUploads();

  if (uploadItems.length) {
    return [...uploadItems, ...baseItems];
  }

  return [
    ...baseItems,
    {
      type: "Uploads",
      title: "Metrics Upload",
      detail: "Most recent upload status and audit signal will appear here.",
      when: "Pending",
    },
  ];
}

function buildDefaultFeedItems(): FeedItem[] {
  return [
    ...buildBaseFeedItemsWithoutUploads(),
    {
      type: "Uploads",
      title: "Metrics Upload",
      detail: "Most recent upload status and audit signal will appear here.",
      when: "Pending",
    },
  ];
}

function buildDefaultUploadItems(): UploadStatusItem[] {
  return [
    {
      title: "Metrics Upload",
      lastRun: "—",
      actor: "—",
      href: "/metrics/uploads",
    },
    {
      title: "Shift Validation",
      lastRun: "—",
      actor: "—",
      href: "/route-lock/shift-validation",
    },
    {
      title: "Check-In Upload",
      lastRun: "—",
      actor: "—",
      href: "/route-lock/check-in",
    },
  ];
}

function buildDefaultBroadcastReach(): BroadcastReachSummary {
  return {
    reachChip: "R: 43/63",
    activeBroadcast: "—",
    audience: "—",
    seen: "—",
    unread: "—",
  };
}

function buildDefaultSupervisorPulseRows(
  viewerFullName?: string | null
): SupervisorPulseRow[] {
  const viewerLabel = viewerFullName?.trim() || "Supervisor";

  return [
    {
      kind: "team_total",
      label: "Team",
      hc: 0,
      metrics: [
        { kpi_key: "tnps", value: null, band_key: null },
        { kpi_key: "ftr", value: null, band_key: null },
        { kpi_key: "toolUsage", value: null, band_key: null },
      ],
    },
    {
      kind: "itg_supervisor_total",
      label: viewerLabel,
      hc: 0,
      metrics: [
        { kpi_key: "tnps", value: null, band_key: null },
        { kpi_key: "ftr", value: null, band_key: null },
        { kpi_key: "toolUsage", value: null, band_key: null },
      ],
    },
  ];
}

function averageMetricValue(
  rows: CompanySupervisorRosterRow[],
  sourceKpiKey: string
) {
  const values = rows
    .map(
      (row) =>
        row.metrics.find((metric) => metric.kpi_key === sourceKpiKey)?.value ?? null
    )
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dominantBandKey(
  rows: CompanySupervisorRosterRow[],
  sourceKpiKey: string
): string | null {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const band = row.metrics.find((metric) => metric.kpi_key === sourceKpiKey)?.band_key;
    const key = String(band ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

function buildSupervisorRowFromRosterRows(args: {
  kind: SupervisorPulseRow["kind"];
  label: string;
  rows: CompanySupervisorRosterRow[];
  sourceMetricKeys: string[];
}) {
  const [tnpsKey = "", ftrKey = "", toolKey = ""] = args.sourceMetricKeys;

  return {
    kind: args.kind,
    label: args.label,
    hc: args.rows.length,
    metrics: [
      {
        kpi_key: "tnps",
        value: averageMetricValue(args.rows, tnpsKey),
        band_key: dominantBandKey(args.rows, tnpsKey),
      },
      {
        kpi_key: "ftr",
        value: averageMetricValue(args.rows, ftrKey),
        band_key: dominantBandKey(args.rows, ftrKey),
      },
      {
        kpi_key: "toolUsage",
        value: averageMetricValue(args.rows, toolKey),
        band_key: dominantBandKey(args.rows, toolKey),
      },
    ],
  } satisfies SupervisorPulseRow;
}

function mapManagerKpiStripToSupervisorTriplet(
  kpiStrip: ManagerKpiStripItem[]
): [
  SupervisorPulseRowMetric,
  SupervisorPulseRowMetric,
  SupervisorPulseRowMetric,
] {
  const findMetric = (matcher: (key: string) => boolean) =>
    kpiStrip.find((item) =>
      matcher(String(item.kpi_key ?? "").trim().toLowerCase())
    );

  const tnps = findMetric((key) => key === "tnps" || key === "tnps_score");
  const ftr = findMetric((key) => key === "ftr" || key === "ftr_rate");
  const tool = findMetric(
    (key) =>
      key === "tool_usage" ||
      key === "tool_usage_rate" ||
      key === "toolusage"
  );

  return [
    {
      kpi_key: "tnps",
      value: tnps?.value ?? null,
      band_key: tnps?.band_key ?? null,
    },
    {
      kpi_key: "ftr",
      value: ftr?.value ?? null,
      band_key: ftr?.band_key ?? null,
    },
    {
      kpi_key: "toolUsage",
      value: tool?.value ?? null,
      band_key: tool?.band_key ?? null,
    },
  ];
}

async function resolveSupervisorPulseRows(
  admin: ReturnType<typeof supabaseAdmin>,
  selectedPcOrgId: string,
  viewerFullName?: string | null
): Promise<SupervisorPulseRow[]> {
  const fallback = buildDefaultSupervisorPulseRows(viewerFullName);

  try {
    const [scope, companyPayload, managerPayload] = await Promise.all([
      resolveCompanySupervisorScope(),
      getCompanySupervisorViewPayload({ range: "FM" }),
      getCompanyManagerViewPayload({ range: "FM" }),
    ]);

    const sourceMetricKeys = (companyPayload.roster_columns as RosterColumn[])
      .slice(0, 3)
      .map((col: RosterColumn) => col.kpi_key);

    if (sourceMetricKeys.length < 3) {
      return fallback;
    }

    const viewerLabel =
      viewerFullName?.trim() || scope.rep_full_name?.trim() || "Supervisor";

    // --- ITG (ROBERT) ROWS ---
    const robertRows = companyPayload.roster_rows.filter(
      (row: CompanySupervisorRosterRow) => row.team_class === "ITG"
    );

    // --- BP SUPERVISOR ROWS ---
    const bpGroups = scope.bp_supervisor_groups.map((group) => {
      const techIdSet = new Set(
        group.tech_ids.map((techId: string) => String(techId).trim())
      );

      const groupRows = companyPayload.roster_rows.filter(
        (row: CompanySupervisorRosterRow) =>
          techIdSet.has(String(row.tech_id ?? "").trim())
      );

      return {
        group,
        rows: groupRows,
      };
    });

    // --- TEAM ROWS (TRUE UNION OF ALL SUPERVISOR ROWS) ---
    const teamRows = [
      ...robertRows,
      ...bpGroups.flatMap((g) => g.rows),
    ];

    // --- TEAM ROW ---
    const teamRow: SupervisorPulseRow = {
      kind: "team_total",
      label: "Team",
      hc: teamRows.length, // ✅ FIXED
      metrics: mapManagerKpiStripToSupervisorTriplet(
        managerPayload.kpi_strip as ManagerKpiStripItem[]
      ),
    };

    // --- BUILD FINAL ROWS ---
    const rows: SupervisorPulseRow[] = [
      teamRow,

      // ROBERT (ITG SUPERVISOR)
      buildSupervisorRowFromRosterRows({
        kind: "itg_supervisor_total",
        label: viewerLabel,
        rows: robertRows,
        sourceMetricKeys,
      }),

      // BP SUPERVISORS
      ...bpGroups.map(({ group, rows }) =>
        buildSupervisorRowFromRosterRows({
          kind: "bp_supervisor",
          label: group.label,
          rows,
          sourceMetricKeys,
        })
      ),
    ];

    return rows;
  } catch {
    return fallback;
  }
}

function buildDefaultWidgetPayload(
  viewerFullName?: string | null
): WidgetPayload {
  return {
    pulse: {
      org: {
        tnps: emptyMetric("Primary org pulse KPI"),
        ftr: emptyMetric("Primary org pulse KPI"),
        toolUsage: emptyMetric("Primary org pulse KPI"),
      },
      offices: [
        { label: "Office 1", status: "Pending", risk: "—" },
        { label: "Office 2", status: "Pending", risk: "—" },
      ],
    },
    supervisorPulse: {
      rows: buildDefaultSupervisorPulseRows(viewerFullName),
    },
    feed: {
      items: buildDefaultFeedItems(),
    },
    uploads: {
      items: buildDefaultUploadItems(),
    },
    broadcast: {
      reach: buildDefaultBroadcastReach(),
    },
  };
}

export async function getWidgetPayload(args: Args): Promise<WidgetPayload> {
  const { role, selectedPcOrgId, viewerFullName } = args;
  const base = buildDefaultWidgetPayload(viewerFullName);

  if (!selectedPcOrgId) {
    return base;
  }

  const admin = supabaseAdmin();

  if (role === "COMPANY_MANAGER") {
    const [pulse, feedItems] = await Promise.all([
      resolveManagerPulse(admin, selectedPcOrgId),
      resolveManagerFeed(admin, selectedPcOrgId),
    ]);

    return {
      ...base,
      pulse,
      feed: {
        items: feedItems,
      },
    };
  }

  if (role === "ITG_SUPERVISOR") {
    const [pulse, feedItems, supervisorRows] = await Promise.all([
      resolveManagerPulse(admin, selectedPcOrgId),
      resolveManagerFeed(admin, selectedPcOrgId),
      resolveSupervisorPulseRows(admin, selectedPcOrgId, viewerFullName),
    ]);

    return {
      ...base,
      pulse,
      supervisorPulse: {
        rows: supervisorRows,
      },
      feed: {
        items: feedItems,
      },
    };
  }

  return base;
}

export async function getFeedWidgetPayload(args: Args): Promise<FeedItem[]> {
  const { role, selectedPcOrgId } = args;

  if (!selectedPcOrgId) {
    return buildDefaultFeedItems();
  }

  const admin = supabaseAdmin();

  if (role === "COMPANY_MANAGER" || role === "ITG_SUPERVISOR") {
    return resolveManagerFeed(admin, selectedPcOrgId);
  }

  return buildDefaultFeedItems();
}