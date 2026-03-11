"use client";

type FieldLogTechFollowupCardProps = {
  busy: boolean;
  canResubmit: boolean;
  onResubmit: () => void | Promise<void>;
};

export function FieldLogTechFollowupCard(
  props: FieldLogTechFollowupCardProps,
) {
  const { busy, canResubmit, onResubmit } = props;

  if (!canResubmit) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Technician Follow-Up</div>
      <div className="mt-2 text-sm text-muted-foreground">
        This report is open for technician resubmission.
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void onResubmit()}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Working…" : "Resubmit"}
      </button>
    </section>
  );
}