//apps/web/src/app/(prod)/(ops)/ops/InviteUserForm.tsx

"use client";

import { useState } from "react";

export default function InviteUserForm() {
  const [email, setEmail] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [out, setOut] = useState<string>("");

  async function onInvite() {
    setOut("Sending invite...");

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, assignment_id: assignmentId }),
      });

      const text = await res.text();

      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        setOut(
          `ERROR: HTTP ${res.status}\n` +
            (json ? JSON.stringify(json, null, 2) : text || "(empty response body)")
        );
        return;
      }

      setOut(`OK: HTTP ${res.status}\n${json ? JSON.stringify(json, null, 2) : text || "(empty body)"}`);
    } catch (e: any) {
      setOut(`NETWORK ERROR:\n${e?.message ?? String(e)}\n\n${e?.stack ?? ""}`);
    }
  }

  return (
    <section className="rounded border p-4" style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}>
      <h2 className="text-sm font-semibold text-[var(--to-ink)]">Invite test manager</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs text-[var(--to-ink-muted)]">Email</span>
          <input
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)", background: "transparent" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test.manager@example.com"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-[var(--to-ink-muted)]">Assignment ID</span>
          <input
            className="rounded border px-3 py-2 text-sm font-mono"
            style={{ borderColor: "var(--to-border)", background: "transparent" }}
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            placeholder="uuid"
          />
        </label>
      </div>

      <div className="mt-4">
        <button
          onClick={onInvite}
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          Send invite
        </button>
      </div>

      {out && (
        <pre className="mt-4 whitespace-pre-wrap rounded border p-3 text-xs" style={{ borderColor: "var(--to-border)", background: "var(--to-surface-2)" }}>
          {out}
        </pre>
      )}
    </section>
  );
}
