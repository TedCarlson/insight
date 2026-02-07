export function toNum(v: number | ""): number {
  return v === "" ? 0 : Number(v);
}

export function safeAvg(totalTickets: number, manpower: number): number {
  if (!manpower || manpower <= 0) return 0;
  return Math.round((totalTickets / manpower) * 100) / 100;
}

export function paceFlag(avg: number): "NONE" | "LOW" | "OK" | "HIGH" {
  if (!Number.isFinite(avg) || avg <= 0) return "NONE";
  if (avg < 15) return "LOW";
  if (avg > 25) return "HIGH";
  return "OK";
}

export function utilizationPct(workingToday: number, baselineTotal: number): number {
  if (!baselineTotal || baselineTotal <= 0) return 0;
  return Math.max(0, Math.round((workingToday / baselineTotal) * 100));
}

export const TARGET_TICKETS_PER_TECH = 20;
export const SLA_OK_THRESHOLD_PCT = 95;

export function estimatedSlaPctAM(ticketsReceivedAM: number, manpower: number): number | null {
  if (!manpower || manpower <= 0) return null;
  if (!ticketsReceivedAM || ticketsReceivedAM <= 0) return null;

  const capacity = manpower * TARGET_TICKETS_PER_TECH;
  const pct = (capacity / ticketsReceivedAM) * 100;
  const capped = Math.min(100, pct);
  return Math.round(capped);
}

export function slaPillStyle(pct: number) {
  const ok = pct >= SLA_OK_THRESHOLD_PCT;
  return ok
    ? { bg: "rgba(16,185,129,0.14)", fg: "rgb(16,185,129)" }
    : { bg: "rgba(249,115,22,0.14)", fg: "rgb(249,115,22)" };
}