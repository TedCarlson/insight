export type ExceptionType =
  | "PTO"
  | "FORCE_OFF"
  | "SICK"
  | "VACATION"
  | "ADD_DAY"
  | "COVER_DAY"
  | "ROUTE_OVERRIDE"
  | "SHIFT_OVERRIDE"
  | string;

export type ImpactState = "SAFE" | "TIGHT" | "RISK";

export type RouteLockDay = {
  date: string;
  quota_routes: number | null;
  scheduled_routes: number;
  delta_forecast: number | null;
};

export type DraftExceptionRow = {
  date: string;
  type: ExceptionType;
  force_off?: boolean | null;
};

export type ExceptionImpact = {
  date: string;
  current_delta: number | null;
  projected_delta: number | null;
  impact_change: number | null;
  state: ImpactState;
};

function removesCapacity(row: DraftExceptionRow) {
  if (row.force_off) return true;

  const type = row.type?.toUpperCase();

  return (
    type === "PTO" ||
    type === "SICK" ||
    type === "VACATION" ||
    type === "FORCE_OFF"
  );
}

function addsCapacity(row: DraftExceptionRow) {
  const type = row.type?.toUpperCase();

  return type === "ADD_DAY" || type === "COVER_DAY";
}

function deriveState(delta: number | null): ImpactState {
  if (delta === null) return "TIGHT";
  if (delta < 0) return "RISK";
  if (delta <= 1) return "TIGHT";
  return "SAFE";
}

function deriveCurrentDelta(day: RouteLockDay): number | null {

  // 1️⃣ Use explicit delta if present
  if (typeof day.delta_forecast === "number" && Number.isFinite(day.delta_forecast)) {
    return day.delta_forecast;
  }

  // 2️⃣ Support capacity/quota fields used by calendar tiles
  const capacity = (day as any).capacity;
  const quota = (day as any).quota;

  if (
    typeof capacity === "number" &&
    Number.isFinite(capacity) &&
    typeof quota === "number" &&
    Number.isFinite(quota)
  ) {
    return capacity - quota;
  }

  // 3️⃣ Fallback to routes if present
  if (
    typeof day.scheduled_routes === "number" &&
    Number.isFinite(day.scheduled_routes) &&
    typeof day.quota_routes === "number" &&
    Number.isFinite(day.quota_routes)
  ) {
    return day.scheduled_routes - day.quota_routes;
  }

  return null;
}

export function computeExceptionImpact(
  day: RouteLockDay,
  row: DraftExceptionRow
): ExceptionImpact {
  const currentDelta = deriveCurrentDelta(day);

  let projectedDelta = currentDelta;

  if (currentDelta !== null) {
    if (removesCapacity(row)) {
      projectedDelta = currentDelta - 1;
    } else if (addsCapacity(row)) {
      projectedDelta = currentDelta + 1;
    }
  }

  const change =
    currentDelta !== null && projectedDelta !== null
      ? projectedDelta - currentDelta
      : null;

  return {
    date: row.date,
    current_delta: currentDelta,
    projected_delta: projectedDelta,
    impact_change: change,
    state: deriveState(projectedDelta),
  };
}