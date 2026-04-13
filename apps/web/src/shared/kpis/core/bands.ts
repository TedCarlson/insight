export type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

export type BandConfig = {
  key: BandKey;
  label: string;
  color: string; // hex or css var
  min?: number | null;
  max?: number | null;
};

export function resolveBand(value: number | null, bands: BandConfig[]): BandKey {
  if (value == null) return "NO_DATA";

  for (const band of bands) {
    const minOk = band.min == null || value >= band.min;
    const maxOk = band.max == null || value <= band.max;

    if (minOk && maxOk) {
      return band.key;
    }
  }

  return "NO_DATA";
}
