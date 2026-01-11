"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction } from "./actions";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      await signInAction(email, password);
      router.replace("/home");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Auth error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Sign in</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          autoComplete="current-password"
        />
        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
        <button disabled={busy || !email || !password}>{busy ? "..." : "Sign in"}</button>
      </form>
    </main>
  );
}
