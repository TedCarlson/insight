import type { TnpsComponents } from "@/shared/kpis/contracts/kpiTypes";

export function computeTnps(components: TnpsComponents): number | null {
  const surveys = Number(components.surveys ?? 0);
  const promoters = Number(components.promoters ?? 0);
  const detractors = Number(components.detractors ?? 0);

  if (!Number.isFinite(surveys) || surveys <= 0) {
    return null;
  }

  if (!Number.isFinite(promoters) || !Number.isFinite(detractors)) {
    return null;
  }

  return (100 * (promoters - detractors)) / surveys;
}