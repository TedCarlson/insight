"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/shared/data/supabase/client";
import { normalizeNext } from "@/lib/navigation/next";

function hardNavigate(to: string) {
  // Forces a full navigation so middleware + SSR cookies take effect immediately.
  window.location.assign(to);
}

function getHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const h = window.location.hash || "";
  const raw = h.startsWith("#") ? h.slice(1) : h;
  return new URLSearchParams(raw);
}

type BootstrapResponse = {
  ok: boolean;
  auth_user_id: string;
  status: string | null;
  person_id: string | null;
  selected_pc_org_id: string | null;
  created: boolean;
  hydrated: boolean;
  notes?: string[];
  error?: string;
};

async function callBootstrap(): Promise<BootstrapResponse | null> {
  try {
    const res = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });

    const json = (await res.json()) as BootstrapResponse;

    if (!res.ok) {
      return { ...json, ok: false, error: json.error ?? `bootstrap failed (${res.status})` };
    }

    return json;
  } catch {
    return null;
  }
}

export default function SetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = normalizeNext(sp.get("next"));
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [out, setOut] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  async function ensureSession(): Promise<boolean> {
    // 0) If a session already exists, we're good.
    const { data: sess, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      setOut(`Session error: ${sessErr.message}`);
      return false;
    }
    if (sess?.session) return true;

    // 1) Try implicit-grant fragment tokens (#access_token, #refresh_token)
    const hp = getHashParams();
    const access_token = hp.get("access_token");
    const refresh_token = hp.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setOut(`Session error: ${error.message}`);
        return false;
      }
      return true;
    }

    // 2) Try PKCE `?code=` (in case user landed here directly, skipping /auth/callback)
    const code = sp.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setOut(`Auth code exchange failed: ${error.message}`);
        return false;
      }
      return true;
    }

    // 3) Try OTP verify with `?token_hash=` + `?type=`
    const type = (sp.get("type") || "").toLowerCase() as
      | "recovery"
      | "invite"
      | "magiclink"
      | "email_change"
      | "";
    const token_hash = sp.get("token_hash") || sp.get("token"); // some flows use token=
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (error) {
        setOut(`OTP verification failed: ${error.message}`);
        return false;
      }
      return true;
    }

    setOut("No active session found. Please open the invite/recovery link again, or ask an admin to resend it.");
    return false;
  }

  function cleanupUrl() {
    // Remove hash and auth query params so refreshes don't re-trigger auth flows.
    if (typeof window === "undefined") return;

    const u = new URL(window.location.href);
    u.hash = "";

    const toDelete = ["code", "token_hash", "token", "type", "error", "reason"];
    toDelete.forEach((k) => u.searchParams.delete(k));

    history.replaceState(null, "", u.pathname + (u.search ? u.search : ""));
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setChecking(true);
      try {
        const ok = await ensureSession();
        if (!alive) return;
        if (ok) {
          // If we successfully established a session, clean the URL right away.
          cleanupUrl();
          setOut("");
        }
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
    // NOTE: sp changes when querystring changes; we want this to re-run if someone pastes a new link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, sp]);

  async function onSubmit() {
    setOut("");

    if (!password || password.length < 8) {
      setOut("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setOut("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const ok = await ensureSession();
      if (!ok) return;

      const { error } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });

      if (error) {
        setOut(`Error setting password: ${error.message}`);
        return;
      }

      const boot = await callBootstrap();
      if (boot?.ok) {
        setOut(`Password set. bootstrap ok (status=${boot.status ?? "?"}). Redirecting…`);
      } else if (boot && !boot.ok) {
        setOut(`Password set. bootstrap not ok. Redirecting…`);
      } else {
        setOut("Password set. Redirecting…");
      }

      cleanupUrl();

      // Hard navigation ensures middleware + cookies are applied immediately.
      hardNavigate(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Set your password</h1>
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">Choose a password to finish onboarding.</p>

      <form
        className="mt-6 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) void onSubmit();
        }}
      >
        <label className="grid gap-1">
          <span className="text-xs text-[var(--to-ink-muted)]">New password</span>
          <input
            type="password"
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)", background: "transparent" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={checking || saving}
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
            disabled={checking || saving}
          />
        </label>

        <button
          type="submit"
          disabled={checking || saving}
          className="mt-2 rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
          style={{ borderColor: "var(--to-border)" }}
        >
          {checking ? "Verifying link..." : saving ? "Saving..." : "Save password"}
        </button>

        <div className="mt-2 flex items-center justify-between">
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-sm underline underline-offset-4">
            Back to login
          </Link>
        </div>

        {out && (
          <pre
            className="whitespace-pre-wrap rounded border p-3 text-xs"
            style={{ borderColor: "var(--to-border)", background: "var(--to-surface-2)" }}
          >
            {out}
          </pre>
        )}
      </form>
    </main>
  );
}
