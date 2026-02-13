"use client";

import * as React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

import {
  GLOBAL_BAND_PRESETS,
  type BandKey,
} from "@/features/metrics-admin/lib/globalBandPresets";

import { useBandStyles } from "@/features/metrics-admin/lib/useBandStyles";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Swatch(props: {
  bg: string;
  text: string;
  border: string;
  label: string;
}) {
  return (
    <div
      className="rounded-md border px-2 py-1 text-xs font-medium"
      style={{
        backgroundColor: props.bg,
        color: props.text,
        borderColor: props.border,
      }}
    >
      {props.label}
    </div>
  );
}

const PRESET_KEYS = Object.keys(GLOBAL_BAND_PRESETS);

function pickDefaultPresetKey() {
  // prefer BRIGHT if it exists, otherwise first key
  if (PRESET_KEYS.includes("BRIGHT")) return "BRIGHT";
  return PRESET_KEYS[0] ?? "BRIGHT";
}

export default function MetricsColorsDrawer({ open, onOpenChange }: Props) {
  const { loading, error, activePresetKey, refresh, savePreset } = useBandStyles();

  const [selectedPreset, setSelectedPreset] = React.useState<string>(() => pickDefaultPresetKey());

  // If user changes selection while drawer is open, we don't want a refresh to overwrite it.
  const dirtyRef = React.useRef(false);

  // On open: refresh from DB so dropdown hydrates to canonical selection
  React.useEffect(() => {
    if (!open) {
      dirtyRef.current = false;
      return;
    }
    void refresh();
  }, [open, refresh]);

  // When DB value changes, hydrate dropdown (unless user already changed it this open session)
  React.useEffect(() => {
    if (!open) return;
    if (dirtyRef.current) return;

    const next =
      activePresetKey && PRESET_KEYS.includes(activePresetKey)
        ? activePresetKey
        : pickDefaultPresetKey();

    setSelectedPreset(next);
  }, [open, activePresetKey]);

  const preset =
    GLOBAL_BAND_PRESETS[selectedPreset] ?? GLOBAL_BAND_PRESETS[pickDefaultPresetKey()];

  async function handleChangePreset(nextKey: string) {
    setSelectedPreset(nextKey);
    dirtyRef.current = true;

    // Persist immediately to DB (global selection)
    await savePreset(nextKey);
    // savePreset() already refreshes; the "Active preset" line will update when it returns
  }

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      title="Band Colors"
      subtitle="Choose global band styling used across all reports."
      widthClass="max-w-xl"
    >
      <div className="space-y-5">
        {/* Preset selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Preset
          </label>

          <Select
            value={selectedPreset}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              void handleChangePreset(e.target.value)
            }
            disabled={loading || PRESET_KEYS.length === 0}
          >
            {PRESET_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>

          <div className="mt-2 text-xs">
            {loading ? (
              <span className="text-muted-foreground">Saving / syncing…</span>
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <span className="text-muted-foreground">
                Active preset (DB):{" "}
                <span className="font-medium text-foreground">
                  {activePresetKey ?? "—"}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="text-sm font-medium">Preview</div>

          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(preset) as BandKey[]).map((bandKey) => {
              const b = preset[bandKey];
              return (
                <div key={bandKey} className="flex items-center gap-3">
                  <div className="w-40 text-xs text-muted-foreground">{bandKey}</div>

                  <Swatch
                    label="Sample"
                    bg={b.bg_color}
                    text={b.text_color}
                    border={b.border_color}
                  />

                  <div className="text-xs text-muted-foreground">
                    {b.bg_color} / {b.text_color} / {b.border_color}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          This is a global UI preset. Reports will reference this preset directly.
        </div>

        <div className="flex gap-2">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    </Drawer>
  );
}