import type { ScorecardTile } from "@/shared/kpis/core/scorecardTypes";
import { GLOBAL_BAND_PRESETS } from "@/features/metrics-admin/lib/globalBandPresets";

type PresetKey = keyof typeof GLOBAL_BAND_PRESETS;
type BandKey = keyof (typeof GLOBAL_BAND_PRESETS)[PresetKey];

function pickPresetKey(activePresetKey: string | null): PresetKey {
  if (activePresetKey && activePresetKey in GLOBAL_BAND_PRESETS) {
    return activePresetKey as PresetKey;
  }

  if ("BRIGHT" in GLOBAL_BAND_PRESETS) {
    return "BRIGHT";
  }

  const first = Object.keys(GLOBAL_BAND_PRESETS)[0];
  return (first ?? "BRIGHT") as PresetKey;
}

function normalizeBandKey(key: string | null | undefined): BandKey | null {
  if (!key) return null;

  const normalized = key.toUpperCase();

  if (
    normalized === "EXCEEDS" ||
    normalized === "MEETS" ||
    normalized === "NEEDS_IMPROVEMENT" ||
    normalized === "MISSES" ||
    normalized === "NO_DATA"
  ) {
    return normalized as BandKey;
  }

  return null;
}

export function mapTilesWithPreset(
  tiles: ScorecardTile[],
  activePresetKey: string | null
): ScorecardTile[] {
  const presetKey = pickPresetKey(activePresetKey);
  const preset = GLOBAL_BAND_PRESETS[presetKey];

  return tiles.map((tile) => {
    const normalizedBandKey = normalizeBandKey(tile.band.band_key);

    if (!normalizedBandKey) return tile;

    const bandPreset = preset?.[normalizedBandKey];

    if (!bandPreset) return tile;

    return {
      ...tile,
      band: {
        ...tile.band,
        paint: {
          preset: presetKey,
          bg: bandPreset.bg_color,
          border: bandPreset.border_color,
          ink: bandPreset.text_color,
        },
      },
    };
  });
}