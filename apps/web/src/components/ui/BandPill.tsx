"use client";

import * as React from "react";

type BandKey = "EXCEEDS" | "MEETS" | "NEEDS_IMPROVEMENT" | "MISSES" | "NO_DATA";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function BandPill({
  band,
  children,
  className,
  title,
}: {
  band: BandKey | string | null | undefined;
  children?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const b = String(band ?? "NO_DATA").toUpperCase() as BandKey;

  const { bg, border, ink } = bandColors(b);

  return (
    <span
      title={title}
      className={cls(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
      style={{
        background: bg,
        borderColor: border,
        color: ink,
      }}
    >
      {children ?? b}
    </span>
  );
}

function bandColors(band: BandKey): { bg: string; border: string; ink: string } {
  const ink = "var(--to-ink)";
  const border = "var(--to-border)";

  if (band === "EXCEEDS") return { bg: "rgba(16, 185, 129, 0.14)", border: "rgba(16, 185, 129, 0.28)", ink };
  if (band === "MEETS") return { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.25)", ink };
  if (band === "NEEDS_IMPROVEMENT") return { bg: "rgba(245, 158, 11, 0.14)", border: "rgba(245, 158, 11, 0.28)", ink };
  if (band === "MISSES") return { bg: "rgba(239, 68, 68, 0.14)", border: "rgba(239, 68, 68, 0.28)", ink };

  // NO_DATA
  return { bg: "var(--to-surface-1)", border, ink: "var(--to-ink-muted)" };
}