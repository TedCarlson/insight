"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { normalizeNext } from "@/lib/navigation/next";

export default function ResetClient() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [email, setEmail] = useState("");
  const [out, setOut] = useState<string>("");
  const [actionLink, setActionLink] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

    async function onSend() {
    setOut("");
    setActionLink("");

    const now = Date.now();
    if (cooldownUntil && now < cooldownUntil) {
      const secs = Math.ceil((cooldownUntil - now) / 1000);
      setOut(`Please wait ${secs}s before trying again.`);
      return;
    }


    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@") || !normalized.includes(".")) {
      setOut("Enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized, next }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

            if (!res.ok) {
        if (res.status === 429 && json?.error === "email_rate_limited") {
          // 60s UI cooldown to prevent hammering
          setCooldownUntil(Date.now() + 60_000);
          setOut(json?.message ?? "Too many email attempts. Please wait a minute and try again.");
          return;
        }

        setOut(
          `ERROR: HTTP ${res.status}\n` +
            (json ? JSON.stringify(json, null, 2) : text || "(empty)")
        );
        return;
      }


            const link = json?.action_link ?? "";

      // Success UX should not depend on action_link (prod won't return it).
      // Always show a generic "check your email" message; show dev link only if provided.
      if (link) {
        setActionLink(link);
        setOut(
          "If an account exists for that email, a password reset email was triggered. (Dev link is shown below for convenience.)"
        );
      } else {
        setOut(
          "If an account exists for that email, you'll receive a password reset link shortly. Please check your inbox and spam/junk folder."
        );
      }

    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(actionLink);
      setOut("Copied link to clipboard.");
    } catch {
      setOut("Could not copy automatically. Please select and copy the link manually.");
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Reset password</h1>
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
        In dev mode, we generate a recovery link for you to open (no email required).
      </p>

      <div className="mt-6 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-[var(--to-ink-muted)]">Email</span>
          <input
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)", background: "transparent" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </label>

        <button
          onClick={onSend}
          disabled={sending || (cooldownUntil ? Date.now() < cooldownUntil : false)}
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
          style={{ borderColor: "var(--to-border)" }}
        >
          {sending ? "Generating..." : cooldownUntil && Date.now() < cooldownUntil ? "Please wait…" : "Generate reset link"}
        </button>

        {actionLink && (
          <div className="grid gap-2 rounded border p-3" style={{ borderColor: "var(--to-border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Recovery link
            </div>
            <pre
              className="whitespace-pre-wrap break-all rounded border p-2 text-xs"
              style={{ borderColor: "var(--to-border)", background: "var(--to-surface-2)" }}
            >
              {actionLink}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
                style={{ borderColor: "var(--to-border)" }}
              >
                Copy link
              </button>
              <a
                href={actionLink}
                className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
                style={{ borderColor: "var(--to-border)" }}
              >
                Open link
              </a>
            </div>
          </div>
        )}

        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-sm underline underline-offset-4 text-[var(--to-ink-muted)]"
        >
          Back to login
        </Link>

        {out && (
          <pre
            className="whitespace-pre-wrap rounded border p-3 text-xs"
            style={{ borderColor: "var(--to-border)", background: "var(--to-surface-2)" }}
          >
            {out}
          </pre>
        )}
      </div>
    </main>
  );
}
