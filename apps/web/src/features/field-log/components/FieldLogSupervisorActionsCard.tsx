"use client";

type FieldLogSupervisorActionsCardProps = {
  busy: boolean;
  canApprove: boolean;
  xmAllowed: boolean;
  xmDeclared: boolean;
  xmLinkValid: boolean;
  xmLink: string;
  followupNote: string;
  onXmLinkChange: (value: string) => void;
  onFollowupNoteChange: (value: string) => void;
  onApprove: () => void | Promise<void>;
  onRequestTechFollowup: () => void | Promise<void>;
  onRequestSupervisorFollowup: () => void | Promise<void>;
};

export function FieldLogSupervisorActionsCard(
  props: FieldLogSupervisorActionsCardProps,
) {
  const {
    busy,
    canApprove,
    xmAllowed,
    xmDeclared,
    xmLinkValid,
    xmLink,
    followupNote,
    onXmLinkChange,
    onFollowupNoteChange,
    onApprove,
    onRequestTechFollowup,
    onRequestSupervisorFollowup,
  } = props;

  if (!canApprove) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Supervisor Actions</div>

      {xmAllowed && xmDeclared && !xmLinkValid ? (
        <div className="mt-3 space-y-3">
          <input
            value={xmLink}
            onChange={(e) => onXmLinkChange(e.target.value)}
            placeholder="https://xm.optek.comcast.net/..."
            className="w-full rounded-xl border px-3 py-3"
          />
          <div className="text-xs text-muted-foreground">
            Append valid XM link before approval if using XM evidence path.
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <div className="text-sm font-medium">Supervisor Note</div>
        <textarea
          value={followupNote}
          onChange={(e) => onFollowupNoteChange(e.target.value)}
          placeholder="Add a short note for approval or follow-up…"
          rows={4}
          className="w-full rounded-xl border px-3 py-3"
        />
        <div className="text-xs text-muted-foreground">
          Recommended for all review actions. Required for follow-up requests.
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onApprove()}
          className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Working…" : "Approve"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onRequestTechFollowup()}
          className="rounded-xl border px-4 py-3 font-semibold"
        >
          Request Tech Follow-Up
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onRequestSupervisorFollowup()}
          className="rounded-xl border px-4 py-3 font-semibold"
        >
          Supervisor Follow-Up
        </button>
      </div>
    </section>
  );
}