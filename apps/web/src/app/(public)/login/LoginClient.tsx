// apps/web/src/app/(public)/login/LoginClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/app/(prod)/_shared/supabase";

type BootstrapResponse = {
  ok: boolean;
  auth_user_id: string;
  status: string | null;
  person_id: string | null;
  selected_pc_org_id: string | null;
  created: boolean;
  hydrated: boolean;
  notes?: string[];
};

async function callBootstrap(): Promise<BootstrapResponse | null> {
  try {
    const res = await fetch("/api/auth/bootstrap", { method: "POST" });
    const json = (await res.json()) as BootstrapResponse;
    return json;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // IMPORTANT: use the SAME client helper as the rest of the UI
  const supabase = useMemo(() => createClient(), []);

  const next = searchParams.get("next") || "/home";

  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [bootMsg, setBootMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data, error }: any) => {
      if (!mounted) return;

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        setSession(data.session);

        // Best-effort bootstrap (ensures profile row exists)
        const boot = await callBootstrap();
        if (boot?.ok) {
          setBootMsg(`bootstrap ok (status=${boot.status ?? "?"})`);
        }

        router.push(next); // honor ?next= if present, else /home
      }
    });

    return () => {
      mounted = false;
    };
  }, [router, supabase, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBootMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      setSession(data.session);

      // Ensure user_profile exists + hydrate from invite metadata
      const boot = await callBootstrap();
      if (boot?.ok) {
        setBootMsg(`bootstrap ok (status=${boot.status ?? "?"})`);
      } else if (boot && !boot.ok) {
        setBootMsg("bootstrap failed (unauthorized)");
      }

      router.push(next); // honor ?next= if present, else /home
    } else {
      setError("Login succeeded but no session was returned.");
    }
  };

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Login</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="email"
        />

        <input
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between gap-3">
          <button type="submit" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
            Sign In
          </button>

          {/* ✅ Forgot password path */}
          <Link
            href={`/login/reset${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-sm underline underline-offset-4 text-gray-700 hover:text-black"
          >
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {bootMsg && <p className="text-xs text-gray-600">{bootMsg}</p>}
        {session && <p className="text-xs text-gray-600">Session active.</p>}
      </form>
    </main>
  );
}
