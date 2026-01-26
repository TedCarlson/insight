// apps/web/src/app/auth/signout/page.tsx
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutPage() {
  useEffect(() => {
    // 1) Kick off best-effort local signout, but DO NOT await it.
    //    This prevents hanging on network / aborted requests.
    try {
      const supabase = createClient();
      void supabase.auth.signOut({ scope: "local" }).catch(() => {});
    } catch {
      // ignore
    }

    // 2) Immediately navigate to server signout to clear HttpOnly SSR cookies and land at /login.
    //    Use replace() so we don't keep /auth/signout in history.
    try {
      window.location.replace("/api/auth/signout");
    } catch {
      // If replace is blocked for some reason, fall back.
      window.location.assign("/api/auth/signout");
    }

    // 3) Safety net: if the browser blocks navigation (rare), retry once.
    const t = window.setTimeout(() => {
      try {
        window.location.replace("/api/auth/signout");
      } catch {
        window.location.assign("/api/auth/signout");
      }
    }, 800);

    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="p-6">
      <p className="text-sm">Signing you out…</p>
      <p className="mt-2 text-xs text-muted-foreground">
        If this doesn’t redirect,{" "}
        <a className="underline" href="/api/auth/signout">
          click here
        </a>
        .
      </p>
    </div>
  );
}
