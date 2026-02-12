"use client";

import * as React from "react";

type UseBandStylesReturn = {
  loading: boolean;
  error: string | null;
  activePresetKey: string | null;
  refresh: () => Promise<void>;
  savePreset: (presetKey: string) => Promise<void>;
};

export function useBandStyles(): UseBandStylesReturn {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activePresetKey, setActivePresetKey] = React.useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/metrics-colors");

      if (!res.ok) throw new Error("Failed to load selection");

      const json = await res.json();
      setActivePresetKey(json.activePresetKey ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function savePreset(presetKey: string) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/metrics-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_key: presetKey }),
      });

      if (!res.ok) throw new Error("Failed to save preset");

      await refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save preset");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  return {
    loading,
    error,
    activePresetKey,
    refresh,
    savePreset,
  };
}