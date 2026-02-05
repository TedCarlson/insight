// apps/web/src/app/(public)/login/LoginClient.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeNext } from "@/lib/navigation/next";
import { createClient } from "@/shared/data/supabase/client";

function hardNavigate(to: string) {
  window.location.assign(to);
}

export default function LoginClient() {
  const sp = useSearchParams();
  const next = useMemo(() => normalizeNext(sp.get("next")), [sp]);
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  function isLikelyEmail(v: string) {
    const s = v.trim().toLowerCase();
    return s.includes("@") && s.includes(".");
  }

  async function onPasswordLogin() {
    setOut("");
    const e = email.trim().toLowerCase();
    if (!isLikelyEmail(e)) return setOut("Enter a valid email.");
    if (!password) return setOut("Enter your password.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) return setOut(error.message);

      hardNavigate(next);
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink() {
    setOut("");
    const e = email.trim().toLowerCase();
    if (!isLikelyEmail(e)) return setOut("Enter a valid email.");

    setLoading(true);
    try {
      // Ensure magic link returns to callback, not directly to app root
      const base =
        (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, "");
      const cb = new URL("/auth/callback", base);
      cb.searchParams.set("type", "magiclink");
      cb.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { emailRedirectTo: cb.toString() },
      });

      if (error) return setOut(error.message);

      setOut("Check your email for a sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Login</h1>
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">Sign in with your password or request a magic link.</p>

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

        <label className="grid gap-1">
          <span className="text-xs text-[var(--to-ink-muted)]">Password</span>
          <input
            type="password"
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)", background: "transparent" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button
          onClick={onPasswordLogin}
          disabled={loading}
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
          style={{ borderColor: "var(--to-border)" }}
        >
          {loading ? "Working…" : "Sign in"}
        </button>

        <Link
          href={`/login/reset${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="inline-flex h-10 items-center justify-center rounded border px-3 text-sm font-medium
                    text-[var(--to-ink)] hover:bg-[var(--to-surface-2)] disabled:opacity-60"
          style={{ borderColor: "var(--to-border)" }}
        >
          Request Reset Code
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