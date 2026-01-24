"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { OrgSelector } from "@/components/OrgSelector";

const HIDE_ON_PREFIXES = ["/login", "/access", "/auth"];

type SessionStatus = { signedIn: boolean; active: boolean };

export default function CoreNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);

  const shouldHideForRoute = HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;

      const e = data.user?.email ?? null;
      setEmail(e);
      setReady(true);

      if (!e) {
        setStatus({ signedIn: false, active: false });
        return;
      }

      try {
        const r = await fetch("/api/session/status", { cache: "no-store" });
        const j = (await r.json()) as SessionStatus;
        if (!alive) return;
        setStatus(j);
      } catch {
        if (!alive) return;
        // safest: if we can't confirm active, hide nav
        setStatus({ signedIn: true, active: false });
      }
    }

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, _session: Session | null) => {
        refresh();
      }
    );

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (shouldHideForRoute) return null;
  if (!ready || !email) return null;
  if (!status?.active) return null;

  async function onSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold">
            TeamOptix
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Org scope lives at the top-level header so every org-scoped surface inherits it. */}
          <div className="hidden sm:block">
            <OrgSelector label="PC" />
          </div>

          <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
