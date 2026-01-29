// apps/web/src/app/(public)/login/LoginClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeNext } from "@/lib/navigation/next";

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createClient(), []);
  const next = normalizeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [bootMsg, setBootMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // IMPORTANT: If Supabase drops invite/recovery tokens onto /login (hash fragment),
  // forward the user to /auth/set-password while preserving the fragment.
  // This fixes the "invite link opens login instead of set-password" loop.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hp = getHashParams();
    const access_token = hp.get("access_token");
    const refresh_token = hp.get("refresh_token");
    const type = (hp.get("type") || "").toLowerCase();

    const isInviteOrRecovery = type === "invite" || type === "recovery";

    if (access_token && refresh_token && isInviteOrRecovery) {
      // Preserve hash so SetPassword page can setSession() from tokens.
      window.location.replace(
        `/auth/set-password?next=${encodeURIComponent(next)}` + window.location.hash
      );
    }
  }, [next]);

  // If a session exists, bounce to next (middleware usually handles this, but this prevents edge-case flashes)
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;

      if (error) return; // don’t show as error; middleware will govern access anyway
      if (data.session) {
        // Best-effort bootstrap
        const boot = await callBootstrap();
        if (boot?.ok) setBootMsg(`bootstrap ok (status=${boot.status ?? "?"})`);
        hardNavigate(next);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase, router, next]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBootMsg("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.session) {
        setError("Login succeeded but no session was returned.");
        return;
      }

      // Best-effort bootstrap
      const boot = await callBootstrap();
      if (boot?.ok) {
        setBootMsg(`bootstrap ok (status=${boot.status ?? "?"})`);
      } else if (boot && !boot.ok) {
        setBootMsg("bootstrap not ok (continuing)");
      }

      hardNavigate(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">Use your credentials to access the app.</p>

      <form onSubmit={handleLogin} className="mt-6 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-[var(--to-ink-muted)]">Email</span>
          <input
            type="email"
            required
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
            required
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: "var(--to-border)", background: "transparent" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
            style={{ borderColor: "var(--to-border)" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <Link
            href={`/login/reset?next=${encodeURIComponent(next)}`}
            className="text-sm underline underline-offset-4 text-[var(--to-ink-muted)] hover:text-[var(--to-ink)]"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <pre
            className="whitespace-pre-wrap rounded border p-3 text-xs"
            style={{ borderColor: "var(--to-border)", background: "var(--to-surface-2)" }}
          >
            {error}
          </pre>
        )}

        {bootMsg && <p className="text-xs text-[var(--to-ink-muted)]">{bootMsg}</p>}
      </form>
    </main>
  );
}
