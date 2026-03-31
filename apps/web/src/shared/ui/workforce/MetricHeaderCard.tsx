type Props = {
  title: string;
  valueDisplay: string | null;
  rangeLabel?: string | null;
};

export default function MetricHeaderCard({
  title,
  valueDisplay,
  rangeLabel,
}: Props) {
  return (
    <div className="rounded-2xl border bg-background px-4 py-3">
      <div className="text-sm font-semibold">
        {title} • {valueDisplay ?? "—"}
      </div>

      {rangeLabel ? (
        <div className="mt-3 inline-flex rounded-xl border bg-muted/20 px-3 py-2">
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {rangeLabel}
            </div>
            <div className="text-sm font-semibold">{valueDisplay ?? "—"}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}