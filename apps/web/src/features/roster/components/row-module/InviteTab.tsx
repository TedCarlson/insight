"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Notice } from "@/components/ui/Notice";
import type { RosterRow } from "@/lib/api";

export function InviteTab(props: {
  row: RosterRow | null;

  assignmentId: string | null;

  inferredEmail: string;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;

  inviteStatus: "idle" | "sending" | "sent" | "error";
  invitePill: { label: string; tone: "neutral" | "success" | "danger" };

  inviteErr: string | null;
  inviteOk: string | null;

  sendInvite: () => void;
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
    sendInvite,
  } = props;

  return (
    <div className="space-y-3">
      <Card title="Invite to app">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm text-[var(--to-ink-muted)]">
              Sends a Supabase invite email to this person. (Owner-only for launch; managers+ later.)
            </div>
            <div className="text-xs text-[var(--to-ink-muted)]">
              Status:{" "}
              <span
                className={
                  invitePill.tone === "success"
                    ? "text-[var(--to-status-success)]"
                    : invitePill.tone === "danger"
                      ? "text-[var(--to-status-danger)]"
                      : "text-[var(--to-ink-muted)]"
                }
              >
                {invitePill.label}
              </span>
            </div>
          </div>

          <Button
            onClick={sendInvite}
            disabled={inviteStatus === "sending" || !assignmentId || !String(inviteEmail ?? "").trim()}
          >
            {inviteStatus === "sending"
              ? "Sending…"
              : inviteStatus === "sent"
                ? "Resend invite"
                : "Send invite"}
          </Button>
        </div>

        {!assignmentId ? (
          <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
            This roster row has no <code className="px-1">assignment_id</code>. Add an assignment before inviting.
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-12 gap-2 text-sm">
          <div className="col-span-4 text-[var(--to-ink-muted)]">PC</div>
          <div className="col-span-8">{(row as any)?.pc_number ?? (row as any)?.pc_id ?? "—"}</div>

          <div className="col-span-4 text-[var(--to-ink-muted)]">MSO</div>
          <div className="col-span-8">{(row as any)?.mso_name ?? "—"}</div>

          <div className="col-span-4 text-[var(--to-ink-muted)]">Division</div>
          <div className="col-span-8">{(row as any)?.division_name ?? "—"}</div>

          <div className="col-span-4 text-[var(--to-ink-muted)]">Region</div>
          <div className="col-span-8">{(row as any)?.region_name ?? "—"}</div>

          <div className="col-span-4 text-[var(--to-ink-muted)]">Email</div>
          <div className="col-span-8">
            <TextInput
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={inferredEmail || "name@company.com"}
            />
            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
              Prefilled from the person record. Edit before sending if needed.
            </div>
          </div>
        </div>

        {inviteErr ? (
          <div className="mt-3">
            <Notice variant="danger" title="Invite failed">
              {inviteErr}
            </Notice>
          </div>
        ) : null}

        {inviteOk ? (
          <div className="mt-3">
            <Notice variant="success" title="Invite sent">
              <pre className="whitespace-pre-wrap break-words text-xs">{inviteOk}</pre>
            </Notice>
          </div>
        ) : null}
      </Card>
    </div>
  );
}