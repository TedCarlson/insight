"use client";

type FieldLogDetailHeaderCardProps = {
  jobNumber: string;
  categoryLabel: string | null;
  categoryKey: string;
  subcategoryLabel: string | null;
  jobType: string | null;
  chipLabel: string;
  chipClassName: string;
  statusTitle: string;
  activeInstruction: string | null;
};

export function FieldLogDetailHeaderCard(
  props: FieldLogDetailHeaderCardProps,
) {
  const {
    jobNumber,
    categoryLabel,
    categoryKey,
    subcategoryLabel,
    jobType,
    chipLabel,
    chipClassName,
    statusTitle,
    activeInstruction,
  } = props;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Field Log</div>
          <h1 className="mt-1 text-2xl font-semibold">{jobNumber}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            {categoryLabel ?? categoryKey}
            {subcategoryLabel ? ` • ${subcategoryLabel}` : ""}
            {jobType ? ` • ${jobType.toUpperCase()}` : ""}
          </div>
        </div>

        <div
          className={`inline-flex min-w-[44px] items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${chipClassName}`}
          title={statusTitle}
        >
          {chipLabel}
        </div>
      </div>

      {activeInstruction ? (
        <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
          {activeInstruction}
        </div>
      ) : null}
    </section>
  );
}