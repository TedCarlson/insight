import type { RatioComponents } from "@/shared/kpis/contracts/kpiTypes";

export function computeRatio(components: RatioComponents): number | null {
  const numerator = Number(components.numerator ?? 0);
  const denominator = Number(components.denominator ?? 0);

  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  if (!Number.isFinite(numerator)) {
    return null;
  }

  return (100 * numerator) / denominator;
}