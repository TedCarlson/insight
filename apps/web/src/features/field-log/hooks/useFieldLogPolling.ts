"use client";

import { useEffect, useRef } from "react";

type UseFieldLogPollingOptions = {
  enabled: boolean;
  intervalMs: number;
  onTick: () => void | Promise<void>;
};

export function useFieldLogPolling(options: UseFieldLogPollingOptions) {
  const { enabled, intervalMs, onTick } = options;

  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function run() {
      if (cancelled) return;
      if (document.hidden) return;

      try {
        await onTickRef.current();
      } catch {
        // ignore polling errors; page-level loaders/errors handle first load
      }
    }

    function schedule() {
      timeoutId = setTimeout(async () => {
        await run();
        if (!cancelled) schedule();
      }, intervalMs);
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        void run();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enabled, intervalMs]);
}