export type BandKey = "EXCEEDS" | "MEETS" | "NEEDS_IMPROVEMENT" | "MISSES" | "NO_DATA";

export const BAND_KEYS: BandKey[] = [
  "EXCEEDS",
  "MEETS",
  "NEEDS_IMPROVEMENT",
  "MISSES",
  "NO_DATA",
];

export type BandStyle = {
  bg_color: string;
  text_color: string;
  border_color: string;
};

export type BandStylePresetMap = Record<string, Record<BandKey, BandStyle>>;

export type BandStyleRow = {
  preset_key: string;
  band_key: BandKey;
  bg_color: string;
  text_color: string;
  border_color: string;
};

export type BandStyleSelection = {
  global_preset_key: string | null;
  mso_preset_key: string | null;
};

export function rowsToPresetMap(rows: BandStyleRow[]): BandStylePresetMap {
  const out: BandStylePresetMap = {};
  for (const r of rows ?? []) {
    const presetKey = String(r?.preset_key ?? "").trim();
    const bandKey = r?.band_key as BandKey;
    if (!presetKey) continue;
    if (!BAND_KEYS.includes(bandKey)) continue;

    out[presetKey] = out[presetKey] ?? ({} as Record<BandKey, BandStyle>);
    out[presetKey][bandKey] = {
      bg_color: String(r.bg_color ?? "").trim(),
      text_color: String(r.text_color ?? "").trim(),
      border_color: String(r.border_color ?? "").trim(),
    };
  }
  return out;
}

export function getEffectivePresetKey(args: {
  presetKeys: string[];
  globalPresetKey: string | null;
  msoPresetKey: string | null;
}): string | null {
  const { presetKeys, globalPresetKey, msoPresetKey } = args;

  if (msoPresetKey && presetKeys.includes(msoPresetKey)) return msoPresetKey;
  if (globalPresetKey && presetKeys.includes(globalPresetKey)) return globalPresetKey;

  return presetKeys.length > 0 ? presetKeys[0] : null;
}