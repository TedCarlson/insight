// apps/web/src/features/metrics-reports/lib/bandColors.ts

export type BandKey = "EXCEEDS" | "MEETS" | "NEEDS_IMPROVEMENT" | "MISSES" | "NO_DATA";

export type BandStyle = {
  bg_color: string;
  text_color: string;
  border_color: string;
};

export type BandPreset = Record<BandKey, BandStyle>;

/**
 * We keep this dead-simple + stable:
 * - Your Color Drawer stores the chosen preset in localStorage.
 * - Reports read that preset key and use these presets for styling.
 *
 * NOTE: "MEETS" is white by design to pop on your soft blue glass UI.
 * NOTE: Needs Improvement is yellow-ish, Misses is orange/red, Exceeds is green.
 */
export const BAND_PRESETS: Record<string, BandPreset> = {
  // Modern spreadsheet palette (clean + high legibility)
  BRIGHT: {
    EXCEEDS: { bg_color: "#16A34A", text_color: "#052E16", border_color: "#86EFAC" }, // green
    MEETS: { bg_color: "#FFFFFF", text_color: "#0B1220", border_color: "#A7C7FF" }, // white
    NEEDS_IMPROVEMENT: { bg_color: "#FBBF24", text_color: "#451A03", border_color: "#FDE68A" }, // amber/yellow
    MISSES: { bg_color: "#F97316", text_color: "#431407", border_color: "#FDBA74" }, // orange
    NO_DATA: { bg_color: "#F1F5F9", text_color: "#334155", border_color: "#CBD5E1" }, // slate
  },

  // Glass-forward (cool + crisp, “frosted” vibe)
  FROSTED: {
    EXCEEDS: { bg_color: "#10B981", text_color: "#052E16", border_color: "#6EE7B7" }, // emerald
    MEETS: { bg_color: "#FFFFFF", text_color: "#0F172A", border_color: "#93C5FD" }, // white w/ blue border
    NEEDS_IMPROVEMENT: { bg_color: "#F59E0B", text_color: "#451A03", border_color: "#FCD34D" }, // amber
    MISSES: { bg_color: "#FB7185", text_color: "#4C0519", border_color: "#FDA4AF" }, // rose
    NO_DATA: { bg_color: "#E5E7EB", text_color: "#334155", border_color: "#CBD5E1" }, // gray
  },

  // Executive + muted (premium soft, still readable)
  MUTED: {
    EXCEEDS: { bg_color: "#1D4ED8", text_color: "#0B1220", border_color: "#93C5FD" }, // blue “exceeds”
    MEETS: { bg_color: "#FFFFFF", text_color: "#111827", border_color: "#C7D2FE" }, // white
    NEEDS_IMPROVEMENT: { bg_color: "#F2C94C", text_color: "#3B2F06", border_color: "#FDE68A" }, // softer yellow
    MISSES: { bg_color: "#F59E0B", text_color: "#3B1D06", border_color: "#FCD34D" }, // amber/orange
    NO_DATA: { bg_color: "#EEF2F6", text_color: "#4B5563", border_color: "#D1D5DB" }, // light gray
  },
};

export const DEFAULT_BAND_PRESET_KEY = "BRIGHT";

/**
 * LocalStorage key that the Color Drawer writes.
 * Keep this constant stable forever so reports never “forget” the selection.
 */
export const BAND_PRESET_STORAGE_KEY = "metrics.bandPresetKey";

/** Safe getter with fallback. */
export function getBandPreset(presetKey: string | null | undefined): BandPreset {
  const k = String(presetKey ?? "").trim();
  return BAND_PRESETS[k] ?? BAND_PRESETS[DEFAULT_BAND_PRESET_KEY];
}

/** Convenience for UIs (dropdown options). */
export function listBandPresetKeys(): string[] {
  return Object.keys(BAND_PRESETS);
}