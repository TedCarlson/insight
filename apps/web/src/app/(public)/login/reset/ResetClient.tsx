//apps/web/src/app/(public)/login/ResetClient.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { normalizeNext } from "@/lib/navigation/next";

export default function ResetClient() {
  const sp = useSearchParams();
  const next = useMemo(() => normalizeNext(sp.get("next")), [sp]);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [out, setOut] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  function hardNavigate(to: string) {
    window.location.assign(to);
  }

  function isLikelyEmail(v: string) {
    const s = v.trim().toLowerCase();
    return s.includes("@") && s.includes(".");
  }

  async function onSendCode() {
    setOut("");

    const now = Date.now();
    if (cooldownUntil && now < cooldownUntil) {
      const secs = Math.ceil((cooldownUntil - now) / 1000);
      setOut(`Please wait ${secs}s before trying again.`);
      return;
    }

    const normalized = email.trim().toLowerCase();
    if (!isLikelyEmail(normalized)) {
      setOut("Enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/auth/code/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized, purpose: "reset" }),
      });

      if (!res.ok) {
        const text = await res.text();
        setOut(`ERROR: HTTP ${res.status}\n${text || "(empty)"}`);
        return;
      }

      setCooldownUntil(Date.now() + 60_000);

      setOut(
        "If an account exists for that email, you’ll receive a 6-digit code shortly. " +
          "Enter it below along with your new password."
      );
    } finally {
      setSending(false);
    }
  }

  async function onSetPassword() {
    setOut("");

    const normalized = email.trim().toLowerCase();
    if (!isLikelyEmail(normalized)) {
      setOut("Enter a valid email address.");
      return;
    }
    const c = code.trim();
    if (c.length < 4) {
      setOut("Enter the code from your email.");
      return;
    }
    if (!password || password.length < 8) {
      setOut("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setOut("Passwords do not match.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/auth/code/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized, code: c, new_password: password }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg = json?.error ? String(json.error) : text || "Password set failed.";
        setOut(msg);
        return;
      }

      setOut("Password set successfully. Redirecting to login…");

      const loginUrl = `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      hardNavigate(loginUrl);
    } finally {
      setVerifying(false);
    }
  }

  const inCooldown = cooldownUntil ? Date.now() < cooldownUntil : false;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Reset password</h1>
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
        We’ll email you a short code. Enter the code and choose a new password. (No clickable auth link required.)
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
          onClick={onSendCode}
          disabled={sending || inCooldown}
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
          style={{ borderColor: "var(--to-border)" }}
        >
          {sending ? "Sending…" : inCooldown ? "Please wait…" : "Send code"}
        </button>

        <div className="mt-2 grid gap-3 rounded border p-3" style={{ borderColor: "var(--to-border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
            Enter code and new password
          </div>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--to-ink-muted)]">Code</span>
            <input
              className="rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--to-border)", background: "transparent" }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--to-ink-muted)]">New password</span>
            <input
              type="password"
              className="rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--to-border)", background: "transparent" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--to-ink-muted)]">Confirm password</span>
            <input
              type="password"
              className="rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--to-border)", background: "transparent" }}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <button
            onClick={onSetPassword}
            disabled={verifying}
            className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
            style={{ borderColor: "var(--to-border)" }}
          >
            {verifying ? "Saving…" : "Save password"}
          </button>
        </div>

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