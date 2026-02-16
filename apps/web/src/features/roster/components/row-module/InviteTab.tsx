"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import type { InvitePill } from "@/features/roster/hooks/rosterRowModule.types";
import type { RosterRow } from "@/shared/lib/api";

function pillStyle(p: InvitePill) {
  if (p === "good") {
    return { background: "rgba(34, 197, 94, 0.14)", borderColor: "var(--to-status-success)", color: "var(--to-status-success)" };
  }
  if (p === "bad") {
    return { background: "rgba(239, 68, 68, 0.12)", borderColor: "var(--to-status-danger)", color: "var(--to-status-danger)" };
  }
  return { background: "rgba(148, 163, 184, 0.12)", borderColor: "var(--to-border)", color: "var(--to-ink-muted)" };
}

export function InviteTab(props: {
  row: RosterRow | null;
  assignmentId: string | null;
  inferredEmail: string;

  inviteEmail: string;
  setInviteEmail: (v: string) => void;

  inviteStatus: "idle" | "sending" | "sent" | "error";
  invitePill: InvitePill;
  inviteErr: string | null;
  inviteOk: boolean;

  status: {
    invited: boolean;
    invited_at: string | null;
    has_profile_row: boolean;
    auth_user_id: string | null;
    has_logged_in: boolean;
    last_sign_in_at: string | null;
    auth_email: string | null;
  } | null;
  statusLoading: boolean;
  statusErr: string | null;

  loadStatus: () => Promise<void> | void;

  inviteButtonLabel: string;
  inviteDisabledReason: string;

  sendInvite: () => Promise<void> | void;
}) {
  const {
    row,
    assignmentId,
    inferredEmail,
    inviteEmail,
    setInviteEmail,
    inviteStatus,
    invitePill,
    inviteErr,
    inviteOk,
    status,
    statusLoading,
    statusErr,
    loadStatus,
    inviteButtonLabel,
    inviteDisabledReason,
    sendInvite,
  } = props;

  const sendDisabled = !inviteOk || inviteStatus === "sending" || Boolean(status?.has_logged_in);

  return (
    <div className="space-y-3">
      <Card title="Invite">
        <div className="space-y-3">
          <div className="text-xs text-[var(--to-ink-muted)]">
            Readiness signals: Invite sent • Profile row • Logged in.
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1">
              <div className="text-xs text-[var(--to-ink-muted)] mb-1">Email</div>
              <TextInput
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={inferredEmail || "name@company.com"}
              />
              <div className="mt-1 text-[11px] text-[var(--to-ink-muted)]">
                assignment_id: <code className="px-1">{assignmentId ? String(assignmentId).slice(0, 8) : "—"}</code>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={loadStatus}
                disabled={statusLoading}
                title="Fetch latest invite/profile/login status"
              >
                {statusLoading ? "Checking…" : "Check status"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={sendInvite}
                disabled={sendDisabled}
                title={sendDisabled && inviteDisabledReason ? inviteDisabledReason : inviteButtonLabel}
              >
                {inviteStatus === "sending" ? "Sending…" : inviteButtonLabel}
              </Button>

              <span className="inline-flex items-center rounded-full border px-2 text-xs h-8" style={pillStyle(invitePill)} title={inviteStatus}>
                {inviteStatus === "idle" ? "Idle" : inviteStatus === "sending" ? "Sending" : inviteStatus === "sent" ? "Sent" : "Error"}
              </span>
            </div>
          </div>

          {inviteErr ? <div className="text-sm text-[var(--to-status-danger)]">{inviteErr}</div> : null}
          {statusErr ? <div className="text-sm text-[var(--to-status-danger)]">{statusErr}</div> : null}

          <div className="mt-2 grid grid-cols-12 gap-2 text-sm">
            <div className="col-span-4 text-[var(--to-ink-muted)]">Invited</div>
            <div className="col-span-8">{status ? (status.invited ? "Yes" : "No") : "—"}</div>

            <div className="col-span-4 text-[var(--to-ink-muted)]">Profile row</div>
            <div className="col-span-8">{status ? (status.has_profile_row ? "Yes" : "No") : "—"}</div>

            <div className="col-span-4 text-[var(--to-ink-muted)]">Logged in</div>
            <div className="col-span-8">{status ? (status.has_logged_in ? "Yes" : "No") : "—"}</div>

            <div className="col-span-4 text-[var(--to-ink-muted)]">Invite/proxy date</div>
            <div className="col-span-8">{status?.invited_at ? String(status.invited_at).slice(0, 19).replace("T", " ") : "—"}</div>

            <div className="col-span-4 text-[var(--to-ink-muted)]">Last sign-in</div>
            <div className="col-span-8">{status?.last_sign_in_at ? String(status.last_sign_in_at).slice(0, 19).replace("T", " ") : "—"}</div>

            <div className="col-span-4 text-[var(--to-ink-muted)]">Auth user</div>
            <div className="col-span-8">
              {status?.auth_user_id ? (
                <span>
                  <code className="px-1">{String(status.auth_user_id).slice(0, 8)}</code>
                  {status?.auth_email ? <span className="ml-2 text-xs text-[var(--to-ink-muted)]">{status.auth_email}</span> : null}
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-[var(--to-ink-muted)]">
            We treat <code className="px-1">user_profile.created_at</code> as a proxy for “invite sent” until we add a dedicated activity/invite log.
          </div>
        </div>
      </Card>
    </div>
  );
}