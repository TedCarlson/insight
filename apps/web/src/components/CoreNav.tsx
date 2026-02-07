"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { AuthChangeEvent, Session } from "@/shared/data/supabase/types";
import { createClient } from "@/shared/data/supabase/client";
import { OrgSelector } from "@/components/OrgSelector";
import { useOrg } from "@/state/org";

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
  const { selectedOrgId } = useOrg();

  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SessionStatus | null>(null);

  const shouldHideForRoute = HIDE_ON_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  // --- Auth/session sync (unchanged behavior, just cleaned) ---
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

  // --- Guards ---
  if (shouldHideForRoute) return null;
  if (!ready || !email) return null;
  if (!status?.active) return null;

  // --- LOB truth comes ONLY from props ---
  const isLocate = lob === "LOCATE";
  const canSeeLocate = Boolean(status?.isOwner) || isLocate;

  function onSignOut() {
    window.location.assign("/auth/signout");
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="flex w-full items-center justify-between px-6 py-3">
        {/* Left */}
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold">
            TeamOptix
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className={
                pathname === "/"
                  ? "rounded-md px-2 py-1 text-sm font-medium text-foreground"
                  : "rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              Home
            </Link>

            <Link
              href="/roster"
              className={
                pathname === "/roster" || pathname.startsWith("/roster/")
                  ? "rounded-md px-2 py-1 text-sm font-medium text-foreground"
                  : "rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              Roster
            </Link>

            {canSeeLocate && (
              <Link
                href="/locate"
                className={
                  pathname === "/locate" || pathname.startsWith("/locate/")
                    ? "rounded-md px-2 py-1 text-sm font-medium text-foreground"
                    : "rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                Locate
              </Link>
            )}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <OrgSelector label="PC" />
          </div>

          <span className="hidden text-xs text-muted-foreground sm:inline">
            {email}
          </span>

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