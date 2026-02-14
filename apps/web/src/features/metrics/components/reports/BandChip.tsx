import type { BandKey } from "@/features/metrics-reports/lib/score";
import { hexToRgba, isWhiteLike } from "@/features/metrics/lib/reports/colors";

export function BandChip({
  bandKey,
  valueText,
  preset,
  title,
}: {
  bandKey: BandKey;
  valueText: string;
  preset: Record<string, any>;
  title?: string;
}) {
  if (!valueText) return <span className="text-[var(--to-ink-muted)]">—</span>;

  const style = preset?.[bandKey] ?? preset?.NO_DATA ?? null;
  if (!style) {
    return (
      <span className="inline-flex min-w-[72px] items-center justify-center rounded-xl border px-4 py-1.5 text-base font-semibold">
        {valueText}
      </span>
    );
  }

  const bg = String(style.bg_color ?? "");
  const border = String(style.border_color ?? "");
  const text = String(style.text_color ?? "");

  let surface = bg;

  if (isWhiteLike(bg)) {
    const tinted = hexToRgba(border, 0.12);
    if (tinted) surface = tinted;
  } else {
    const softened = hexToRgba(bg, 0.9);
    if (softened) surface = softened;
  }

  return (
    <span
      title={title ?? bandKey}
      className="inline-flex min-w-[72px] items-center justify-center rounded-xl border px-4 py-1.5 text-base font-semibold leading-none shadow-sm"
      style={{
        backgroundColor: surface,
        color: text,
        borderColor: border,
      }}
    >
      {valueText}
    </span>
  );
}