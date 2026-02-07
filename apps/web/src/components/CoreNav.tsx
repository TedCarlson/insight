"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AuthChangeEvent, Session } from "@/shared/data/supabase/types";
import { createClient } from "@/shared/data/supabase/client";
import { OrgSelector } from "@/components/OrgSelector";

type CoreNavProps = {
  lob: "FULFILLMENT" | "LOCATE";
};

type SessionStatus = {
  signedIn: boolean;
  active: boolean;
  isOwner?: boolean;
};

const HIDE_ON_PREFIXES = ["/login", "/access", "/auth"];

export default function CoreNav({ lob }: CoreNavProps) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [switching, setSwitching] = useState(false);

  const shouldHideForRoute = HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p));

  const isOwner = Boolean(status?.isOwner);

  const homeHref = lob === "LOCATE" ? "/locate" : "/fulfillment";
  const homeActive =
    (lob === "LOCATE" && (pathname === "/locate" || pathname.startsWith("/locate/"))) ||
    (lob === "FULFILLMENT" && (pathname === "/fulfillment" || pathname.startsWith("/fulfillment/")));

  const onSignOut = useCallback(() => {
    window.location.assign("/auth/signout");
  }, []);

  const switchLob = useCallback(
    async (next: "FULFILLMENT" | "LOCATE") => {
      if (!isOwner) return;
      if (switching) return;

      const nextHref = next === "LOCATE" ? "/locate" : "/fulfillment";
      if (pathname === nextHref || pathname.startsWith(nextHref + "/")) return;

      setSwitching(true);
      try {
        // Clear org selection server-side first so we don't bleed scope across LOB
        await fetch("/api/profile/select-org", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selected_pc_org_id: null }),
        });
      } catch {
        // best-effort; OrgProvider will also clear on lob change
      } finally {
        window.location.assign(nextHref);
      }
    },
    [isOwner, pathname, switching]
  );

  useEffect(() => {
    // Critical: do not call Supabase auth/session endpoints on login/auth/access routes
    if (shouldHideForRoute) return;

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
        setStatus({ signedIn: true, active: false });
      }
    }

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, _session: Session | null) => {
      refresh();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, shouldHideForRoute]);

  // Render guards (after all hooks)
  if (shouldHideForRoute) return null;
  if (!ready || !email) return null;
  if (!status?.active) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="flex w-full items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href={homeHref} className="text-sm font-semibold">
            TeamOptix
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href={homeHref}
              className={
                homeActive
                  ? "rounded-md px-2 py-1 text-sm font-medium text-foreground"
                  : "rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              Home
            </Link>

            {isOwner && (
              <div className="ml-2 flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-muted-foreground">LOB</span>

                <button
                  type="button"
                  onClick={() => switchLob("FULFILLMENT")}
                  disabled={switching}
                  className={
                    pathname === "/fulfillment" || pathname.startsWith("/fulfillment/")
                      ? "rounded-md px-2 py-1 text-sm font-medium text-foreground"
                      : "rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                  }
                  aria-label="Switch to Fulfillment"
                >
                  Fulfillment
                </button>

                <button
                  type="button"
                  onClick={() => switchLob("LOCATE")}
                  disabled={switching}
                  className={
                    pathname === "/locate" || pathname.startsWith("/locate/")
                      ? "rounded-md px-2 py-1 text-sm font-medium text-foreground"
                      : "rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                  }
                  aria-label="Switch to Locate"
                >
                  Locate
                </button>
              </div>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <OrgSelector label="PC" />
          </div>

          <span className="hidden sm:inline text-xs text-muted-foreground">{email}</span>

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