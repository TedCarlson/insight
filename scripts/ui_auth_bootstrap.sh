#!/usr/bin/env bash
set -euo pipefail

WEB_DIR="apps/web"
SHELL_LAYOUT="$WEB_DIR/src/app/(shell)/layout.tsx"

test -d "$WEB_DIR" || { echo "ERROR: missing $WEB_DIR"; exit 1; }

ENV_FILE="$WEB_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOT'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOT
  echo "created $ENV_FILE"
else
  echo "$ENV_FILE exists (leaving as-is)"
fi

pnpm -w install
pnpm -C "$WEB_DIR" add @supabase/supabase-js @supabase/ssr

mkdir -p "$WEB_DIR/src/lib/supabase"

cat > "$WEB_DIR/src/lib/supabase/client.ts" <<'EOT'
import { createClient } from "@supabase/supabase-js";

export const supabaseBrowser = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
EOT

cat > "$WEB_DIR/src/lib/supabase/server.ts" <<'EOT'
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const supabaseServer = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
};
EOT

cat > "$WEB_DIR/src/app/page.tsx" <<'EOT'
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (data?.user) redirect("/home");

  return (
    <main style={{ padding: 24 }}>
      <h1>TeamOptix Insight</h1>
      <p>UI-first phase. Views are contracts. RLS stays enabled.</p>
      <div style={{ marginTop: 16 }}>
        <Link href="/login">Sign in</Link>
      </div>
    </main>
  );
}
EOT

mkdir -p "$WEB_DIR/src/app/login"
cat > "$WEB_DIR/src/app/login/page.tsx" <<'EOT'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) return setErr(error.message);

    router.replace("/home");
    router.refresh();
  };

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Sign in</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Password
          <input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

        <button type="submit" disabled={busy || !email || !password}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
EOT

test -f "$SHELL_LAYOUT" || { echo "ERROR: missing $SHELL_LAYOUT"; exit 1; }
cp "$SHELL_LAYOUT" "$SHELL_LAYOUT.bak.$(date +%Y%m%d-%H%M%S)"

cat > "$SHELL_LAYOUT" <<'EOT'
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) redirect("/login");

  return (
    <>
      {/* TODO: re-add existing shell chrome/nav here if needed */}
      {children}
    </>
  );
}
EOT

echo "DONE:"
echo " - paste keys into apps/web/.env.local"
echo " - run: pnpm -C apps/web dev"
