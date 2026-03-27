import type { KpiBandKey, KpiBandPaint } from "@/shared/kpis/core/types";

type PresetKey = string | null | undefined;

function defaultPaintForBand(band: KpiBandKey): KpiBandPaint {
  switch (band) {
    case "EXCEEDS":
      return {
        preset: "BAND_EXCEEDS",
        bg: "var(--to-surface-2)",
        border: "var(--to-success)",
        ink: null,
      };
    case "MEETS":
      return {
        preset: "BAND_MEETS",
        bg: "var(--to-surface-2)",
        border: "var(--to-primary)",
        ink: null,
      };
    case "NEEDS_IMPROVEMENT":
      return {
        preset: "BAND_NEEDS_IMPROVEMENT",
        bg: "var(--to-surface-2)",
        border: "var(--to-warning)",
        ink: null,
      };
    case "MISSES":
      return {
        preset: "BAND_MISSES",
        bg: "var(--to-surface-2)",
        border: "var(--to-danger)",
        ink: null,
      };
    default:
      return {
        preset: "BAND_NO_DATA",
        bg: "var(--to-surface-2)",
        border: "var(--to-border)",
        ink: null,
      };
  }
}

function executivePaintForBand(band: KpiBandKey): KpiBandPaint {
  switch (band) {
    case "EXCEEDS":
      return {
        preset: "EXECUTIVE_BAND_EXCEEDS",
        bg: "color-mix(in oklab, var(--to-success) 10%, white)",
        border: "var(--to-success)",
        ink: null,
      };
    case "MEETS":
      return {
        preset: "EXECUTIVE_BAND_MEETS",
        bg: "color-mix(in oklab, var(--to-primary) 10%, white)",
        border: "var(--to-primary)",
        ink: null,
      };
    case "NEEDS_IMPROVEMENT":
      return {
        preset: "EXECUTIVE_BAND_NEEDS_IMPROVEMENT",
        bg: "color-mix(in oklab, var(--to-warning) 10%, white)",
        border: "var(--to-warning)",
        ink: null,
      };
    case "MISSES":
      return {
        preset: "EXECUTIVE_BAND_MISSES",
        bg: "color-mix(in oklab, var(--to-danger) 10%, white)",
        border: "var(--to-danger)",
        ink: null,
      };
    default:
      return {
        preset: "EXECUTIVE_BAND_NO_DATA",
        bg: "rgb(var(--muted) / 0.08)",
        border: "var(--to-border)",
        ink: null,
      };
  }
}

function vividPaintForBand(band: KpiBandKey): KpiBandPaint {
  switch (band) {
    case "EXCEEDS":
      return {
        preset: "VIVID_BAND_EXCEEDS",
        bg: "color-mix(in oklab, var(--to-success) 16%, white)",
        border: "var(--to-success)",
        ink: null,
      };
    case "MEETS":
      return {
        preset: "VIVID_BAND_MEETS",
        bg: "color-mix(in oklab, var(--to-primary) 16%, white)",
        border: "var(--to-primary)",
        ink: null,
      };
    case "NEEDS_IMPROVEMENT":
      return {
        preset: "VIVID_BAND_NEEDS_IMPROVEMENT",
        bg: "color-mix(in oklab, var(--to-warning) 16%, white)",
        border: "var(--to-warning)",
        ink: null,
      };
    case "MISSES":
      return {
        preset: "VIVID_BAND_MISSES",
        bg: "color-mix(in oklab, var(--to-danger) 16%, white)",
        border: "var(--to-danger)",
        ink: null,
      };
    default:
      return {
        preset: "VIVID_BAND_NO_DATA",
        bg: "rgb(var(--muted) / 0.10)",
        border: "var(--to-border)",
        ink: null,
      };
  }
}

function normalizePresetKey(presetKey: PresetKey) {
  return String(presetKey ?? "").trim().toLowerCase();
}

export function resolvePresetPaint(args: {
  bandKey: KpiBandKey;
  activePresetKey?: PresetKey;
}): KpiBandPaint {
  const bandKey = args.bandKey;
  const presetKey = normalizePresetKey(args.activePresetKey);

  if (presetKey === "executive") {
    return executivePaintForBand(bandKey);
  }

  if (presetKey === "vivid") {
    return vividPaintForBand(bandKey);
  }

  return defaultPaintForBand(bandKey);
}