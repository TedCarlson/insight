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

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/metrics-colors", { method: "GET" });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const msg = j?.error ? String(j.error) : "Failed to load selection";
        throw new Error(msg);
      }

      const json = await res.json().catch(() => null);
      setActivePresetKey(json?.activePresetKey ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load selection");
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreset = React.useCallback(
    async (presetKey: string) => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/metrics-colors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preset_key: presetKey }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          const msg = j?.error ? String(j.error) : "Failed to save selection";
          const detail = j?.detail ? ` — ${String(j.detail)}` : "";
          throw new Error(`${msg}${detail}`);
        }

        // Pull canonical DB state back in
        await refresh();
      } catch (err: any) {
        setError(err?.message ?? "Failed to save selection");
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    error,
    activePresetKey,
    refresh,
    savePreset,
  };
}