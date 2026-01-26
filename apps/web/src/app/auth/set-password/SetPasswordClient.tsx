"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeNext } from "@/lib/navigation/next";

function getHashParams() {
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

    // If API returns non-200 but still JSON, preserve it.
    if (!res.ok) {
      return { ...json, ok: false, error: json.error ?? `bootstrap failed (${res.status})` };
    }

    return json;
  } catch {
    return null;
  }
}

export default function SetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = normalizeNext(sp.get("next"));

  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [out, setOut] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function ensureSessionFromHashIfNeeded() {
    // If a session already exists, great.
    const { data: sess } = await supabase.auth.getSession();
    if (sess?.session) return true;

    // Otherwise try to create session from fragment tokens.
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

    setOut("No active session found. Please open the recovery/invite link again.");
    return false;
  }

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
      const ok = await ensureSessionFromHashIfNeeded();
      if (!ok) return;

      const { error } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });

      if (error) {
        setOut(`Error setting password: ${error.message}`);
        return;
      }

      // Bootstrap profile row + hydrate metadata linkages (best-effort)
      const boot = await callBootstrap();
      if (boot?.ok) {
        setOut(`Password set. bootstrap ok (status=${boot.status ?? "?"}). Redirecting…`);
      } else if (boot && !boot.ok) {
        setOut(`Password set. bootstrap not ok. Redirecting…`);
      } else {
        setOut("Password set. Redirecting…");
      }

      // Optional: clear hash from URL for cleanliness
      if (typeof window !== "undefined" && window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }

      router.replace(next);
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
          type="submit"
          disabled={saving}
          className="mt-2 rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
          style={{ borderColor: "var(--to-border)" }}
        >
          {saving ? "Saving..." : "Save password"}
        </button>

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
