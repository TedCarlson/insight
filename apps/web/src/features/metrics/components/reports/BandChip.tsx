import { hexToRgba, isWhiteLike } from "@/features/metrics/lib/reports/colors";
import type { BandKey } from "@/features/metrics-reports/lib/score";

export type ChipTrend = "UP" | "DOWN" | "FLAT" | null;

/**
 * KPI band chip:
 * - sized to feel equal weight with other table text
 * - consistent width so columns read clean
 * - slightly softer surface, crisp border
 *
 * Optional `trend` renders a tiny arrow beside the pill.
 */
export function BandChip({
  bandKey,
  valueText,
  preset,
  title,
  trend = null,
}: {
  bandKey: BandKey;
  valueText: string;
  preset: Record<string, any>;
  title?: string;
  trend?: ChipTrend;
}) {
  if (!valueText) return <span className="text-[var(--to-ink-muted)]">—</span>;

  const style = preset?.[bandKey] ?? preset?.NO_DATA ?? null;

  const arrow =
    trend === "UP" ? "↑" : trend === "DOWN" ? "↓" : trend === "FLAT" ? "→" : "";

  if (!style) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex min-w-[56px] items-center justify-center rounded-lg border px-3 py-1 text-sm font-semibold">
          {valueText}
        </span>
        {arrow ? <span className="text-xs text-[var(--to-ink-muted)]">{arrow}</span> : null}
      </span>
    );
  }

  const bg = String(style.bg_color ?? "");
  const border = String(style.border_color ?? "");
  const text = String(style.text_color ?? "");

  let surface = bg;

  // If bg is white, tint using border so MEETS is still visible.
  if (isWhiteLike(bg)) {
    const tinted = hexToRgba(border, 0.12);
    if (tinted) surface = tinted;
  } else {
    const softened = hexToRgba(bg, 0.88);
    if (softened) surface = softened;
  }

  return (
    <span className="inline-flex items-center gap-1" title={title ?? bandKey}>
      <span
        className={[
          // sizing
          "inline-flex min-w-[56px] items-center justify-center",
          "rounded-lg border px-3 py-1",
          // typography
          "text-sm font-semibold leading-none",
          // subtle polish
          "shadow-[0_1px_0_rgba(0,0,0,0.04)]",
        ].join(" ")}
        style={{
          backgroundColor: surface,
          color: text,
          borderColor: border,
        }}
      >
        {valueText}
      </span>

      {arrow ? <span className="text-xs text-[var(--to-ink-muted)]">{arrow}</span> : null}
    </span>
  );
}