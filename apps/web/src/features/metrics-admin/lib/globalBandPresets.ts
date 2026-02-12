export type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

export type BandStyle = {
  bg_color: string;
  text_color: string;
  border_color: string;
};

export type BandPreset = Record<BandKey, BandStyle>;

export const GLOBAL_BAND_PRESETS: Record<string, BandPreset> = {
  // ---------------------------------------------------------
  // 1. MODERN SPREADSHEET (clean, professional)
  // ---------------------------------------------------------
  MODERN: {
    EXCEEDS: {
      bg_color: "#16A34A",
      text_color: "#F0FDF4",
      border_color: "#22C55E",
    },
    MEETS: {
      bg_color: "#FFFFFF",
      text_color: "#111827",
      border_color: "#CBD5E1",
    },
    NEEDS_IMPROVEMENT: {
      bg_color: "#FACC15",
      text_color: "#111827",
      border_color: "#EAB308",
    },
    MISSES: {
      bg_color: "#EA580C",
      text_color: "#FFF7ED",
      border_color: "#FDBA74",
    },
    NO_DATA: {
      bg_color: "#F1F5F9",
      text_color: "#475569",
      border_color: "#CBD5E1",
    },
  },

  // ---------------------------------------------------------
  // 2. GLASS BLUE (glass-theme aligned)
  // ---------------------------------------------------------
  GLASS_BLUE: {
    EXCEEDS: {
      bg_color: "rgba(37, 99, 235, 0.18)",
      text_color: "#1E3A8A", // dark blue
      border_color: "rgba(37, 99, 235, 0.45)",
    },
    MEETS: {
      bg_color: "#FFFFFF",
      text_color: "#0F172A",
      border_color: "#93C5FD",
    },
    NEEDS_IMPROVEMENT: {
      bg_color: "rgba(234, 179, 8, 0.18)",
      text_color: "#92400E", // dark amber
      border_color: "rgba(234, 179, 8, 0.45)",
    },
    MISSES: {
      bg_color: "rgba(249, 115, 22, 0.18)",
      text_color: "#7C2D12", // dark orange
      border_color: "rgba(249, 115, 22, 0.45)",
    },
    NO_DATA: {
      bg_color: "rgba(148, 163, 184, 0.15)",
      text_color: "#334155",
      border_color: "rgba(148, 163, 184, 0.35)",
    },
  },

  // ---------------------------------------------------------
  // 3. EXECUTIVE MUTED (premium + subtle)
  // ---------------------------------------------------------
  EXECUTIVE: {
    EXCEEDS: {
      bg_color: "#274C77",
      text_color: "#F1F7FF",
      border_color: "#6CA6D9",
    },
    MEETS: {
      bg_color: "#FFFFFF",
      text_color: "#111827",
      border_color: "#C7D2FE",
    },
    NEEDS_IMPROVEMENT: {
      bg_color: "#EAB308",
      text_color: "#1F2937",
      border_color: "#FACC15",
    },
    MISSES: {
      bg_color: "#B45309",
      text_color: "#FFF7ED",
      border_color: "#F59E0B",
    },
    NO_DATA: {
      bg_color: "#EEF2F6",
      text_color: "#4B5563",
      border_color: "#D1D5DB",
    },
  },
};