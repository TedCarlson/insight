// path: apps/web/src/features/role-company-manager/pages/CompanyManagerMetricsPageShell.tsx

import Link from "next/link";

import MetricsSmartHeader from "@/shared/surfaces/MetricsSmartHeader";
import CompanyManagerScopedViewClient from "../components/CompanyManagerScopedViewClient";
import { getCompanyManagerSurfacePayload } from "../lib/getCompanyManagerSurfacePayload.server";

type ReportClassType = "NSR" | "SMART";
type MetricsRangeKey = "FM" | "PREVIOUS" | "3FM" | "12FM";

type Props = {
  range?: string;
  class_type: ReportClassType;
};

function toProfileKey(classType: ReportClassType): "NSR" | "SMART" {
  return classType === "SMART" ? "SMART" : "NSR";
}

function normalizeRangeKey(value: string | undefined): MetricsRangeKey {
  const upper = String(value ?? "FM").trim().toUpperCase();
  if (upper === "PREVIOUS") return "PREVIOUS";
  if (upper === "3FM") return "3FM";
  if (upper === "12FM") return "12FM";
  return "FM";
}

function toRangeLabel(rangeKey: MetricsRangeKey): string {
  if (rangeKey === "FM") return "Current";
  if (rangeKey === "PREVIOUS") return "Previous";
  if (rangeKey === "3FM") return "Previous 3FM";
  return "Previous 12FM";
}

function buildMetricsHref(args: {
  class_type: ReportClassType;
  range: MetricsRangeKey;
}) {
  const params = new URLSearchParams();
  params.set("class_type", args.class_type);
  params.set("range", args.range);
  return `/company-manager/metrics?${params.toString()}`;
}

function ClassSelector(props: {
  class_type: ReportClassType;
  range: MetricsRangeKey;
}) {
  const baseClass =
    "inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition";
  const activeClass =
    "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)] text-foreground";
  const idleClass =
    "border-[var(--to-border)] bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground";

  return (
    <div className="flex items-center gap-2">
      <Link
        href={buildMetricsHref({ class_type: "NSR", range: props.range })}
        className={[
          baseClass,
          props.class_type === "NSR" ? activeClass : idleClass,
        ].join(" ")}
      >
        NSR
      </Link>

      <Link
        href={buildMetricsHref({ class_type: "SMART", range: props.range })}
        className={[
          baseClass,
          props.class_type === "SMART" ? activeClass : idleClass,
        ].join(" ")}
      >
        SMART
      </Link>
    </div>
  );
}

function RangeSelector(props: {
  class_type: ReportClassType;
  active_range: MetricsRangeKey;
  available_ranges: MetricsRangeKey[];
}) {
  const baseClass =
    "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition";
  const activeClass =
    "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)] text-foreground";
  const idleClass =
    "border-[var(--to-border)] bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.available_ranges.map((rangeKey) => (
        <Link
          key={rangeKey}
          href={buildMetricsHref({
            class_type: props.class_type,
            range: rangeKey,
          })}
          className={[
            baseClass,
            props.active_range === rangeKey ? activeClass : idleClass,
          ].join(" ")}
        >
          {toRangeLabel(rangeKey)}
        </Link>
      ))}
    </div>
  );
}

export default async function CompanyManagerMetricsPageShell(props: Props) {
  const range = normalizeRangeKey(props.range);

  const payload = await getCompanyManagerSurfacePayload({
    profile_key: toProfileKey(props.class_type),
    range,
  });

  return (
    <div className="space-y-4 p-4">
      <MetricsSmartHeader
        header={payload.header}
        rangeOptions={[]}
        rightActions={
          <div className="flex flex-col items-end gap-2">
            <RangeSelector
              class_type={props.class_type}
              active_range={payload.filters.active_range}
              available_ranges={payload.filters.available_ranges}
            />
            <ClassSelector
              class_type={props.class_type}
              range={payload.filters.active_range}
            />
          </div>
        }
      />

      <CompanyManagerScopedViewClient payload={payload} />
    </div>
  );
}