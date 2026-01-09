"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/home");
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // If email confirmations are OFF, user is typically signed in immediately.
        // If confirmations are ON, they must confirm via email to get a session.
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          router.replace("/home");
          router.refresh();
          return;
        }

        setMsg("Account created. If email confirmation is enabled, check your inbox to confirm.");
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/auth/reset`,
        });
        if (error) throw error;

        setMsg("Password reset email sent (if SMTP/email is configured).");
        return;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Auth error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}</h1>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={() => setMode("signin")} disabled={busy || mode === "signin"}>
          Sign in
        </button>
        <button type="button" onClick={() => setMode("signup")} disabled={busy || mode === "signup"}>
          Create account
        </button>
        <button type="button" onClick={() => setMode("reset")} disabled={busy || mode === "reset"}>
          Reset password
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
        </label>

        {mode !== "reset" ? (
          <label>
            Password
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        ) : null}

        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
        {msg ? <div>{msg}</div> : null}

        <button
          type="submit"
          disabled={
            busy || !email || (mode !== "reset" && !password)
          }
        >
          {busy ? "Working..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
        </button>
      </form>
    </main>
  );
}
