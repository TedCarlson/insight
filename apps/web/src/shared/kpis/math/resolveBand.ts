import type { BandKey } from "@/shared/kpis/contracts/kpiTypes";

export type KpiBandDefinition = {
  band_key: BandKey;
  min_value: number | null;
  max_value: number | null;
};

export function resolveBand(args: {
  value: number | null;
  bands: KpiBandDefinition[];
}): BandKey | null {
  const { value, bands } = args;

  if (value == null || !Number.isFinite(value)) {
    return "NO_DATA";
  }

  for (const band of bands) {
    const min = band.min_value ?? -Infinity;
    const max = band.max_value ?? Infinity;

    if (value >= min && value <= max) {
      return band.band_key;
    }
  }

  return null;
}