"use client";

import { useMemo, useState } from "react";
import type { RosterRow } from "@/lib/api";
import { sendInviteAction } from "../rosterRowModule.actions";

type InviteStatus = "idle" | "sending" | "sent" | "error";

export function useInviteTab(args: {
  open: boolean; // kept for API symmetry; not used for state effects
  row: RosterRow | null;
  assignmentId: string | null;
  personEmails?: string | null; // optional: if you already have person.emails handy
}) {
  const { row, assignmentId, personEmails } = args;

  const inferredEmail = useMemo(() => {
    const s = String(personEmails ?? (row as any)?.emails ?? (row as any)?.email ?? "").trim();
    if (!s) return "";
    const first = s
      .split(/[;,\n]+/)
      .map((x) => x.trim())
      .filter(Boolean)[0];
    return first ?? "";
  }, [personEmails, row]);

  /**
   * IMPORTANT:
   * We avoid setState in useEffect (lint rule) by "keying" our local state to a
   * derived identity, and resetting synchronously during render ONLY when that key changes.
   * This is safe because it happens at most once per key change (guarded by lastKey state).
   */
  const identityKey = useMemo(() => {
    const rid =
      String((row as any)?.person_id ?? (row as any)?.assignment_id ?? (row as any)?.tech_id ?? (row as any)?.id ?? "");
    return `${assignmentId ?? ""}::${rid}::${inferredEmail}`;
  }, [row, assignmentId, inferredEmail]);

  const [lastKey, setLastKey] = useState<string>(identityKey);

  const [inviteEmail, setInviteEmail] = useState<string>(inferredEmail);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("idle");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState<string | null>(null);

  // Reset on identity change (no effect; guarded)
  if (lastKey !== identityKey) {
    setLastKey(identityKey);
    setInviteEmail(inferredEmail);
    setInviteStatus("idle");
    setInviteErr(null);
    setInviteOk(null);
  }

  async function sendInvite() {
    await sendInviteAction({
      assignmentId: assignmentId ? String(assignmentId) : "",
      email: String(inviteEmail ?? ""),
      setStatus: setInviteStatus,
      setErr: setInviteErr,
      setOk: setInviteOk,
    });
  }

  const invitePill = useMemo(() => {
    if (inviteStatus === "sending") return { label: "Sending…", tone: "neutral" as const };
    if (inviteStatus === "sent") return { label: "Sent", tone: "success" as const };
    if (inviteStatus === "error") return { label: "Error", tone: "danger" as const };
    return { label: "Not sent", tone: "neutral" as const };
  }, [inviteStatus]);

  return {
    inferredEmail,

    inviteEmail,
    setInviteEmail,

    inviteStatus,
    invitePill,

    inviteErr,
    inviteOk,

    sendInvite,
  };
}