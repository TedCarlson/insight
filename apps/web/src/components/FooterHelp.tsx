// apps/web/src/components/FooterHelp.tsx
"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

function isManagerPlus(positionTitle: unknown): boolean {
  if (typeof positionTitle !== "string") return false;
  const t = positionTitle.trim().toLowerCase();
  if (!t) return false;

  // "manager or higher" (covers common enterprise titles)
  return (
    t.includes("manager") ||
    t.includes("director") ||
    t.includes("head") ||
    t.includes("vp") ||
    t.includes("vice president") ||
    t.includes("president") ||
    t.includes("chief") ||
    t.includes("cxo") ||
    t.includes("owner") ||
    t.includes("partner") ||
    t.includes("principal")
  );
}

export default function FooterHelp() {
  const supabase = useMemo(() => createClient(), []);
  const [canSeeAdmin, setCanSeeAdmin] = useState(false);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;

        const user = data.user ?? null;
        if (!user) {
          setCanSeeAdmin(false);
          return;
        }

        // Owner is always allowed to see the admin entry point.
        try {
          const { data: isOwner } = await supabase.rpc("is_owner");
          if (!alive) return;
          if (isOwner) {
            setCanSeeAdmin(true);
            return;
          }
        } catch {
          // If the RPC doesn't exist or fails, fall back to title gating below.
        }

        // Title gate: read from auth metadata (invite flow stamps position_title).
        const title = (user.user_metadata as any)?.position_title ?? (user.user_metadata as any)?.positionTitle ?? null;
        setCanSeeAdmin(isManagerPlus(title));
      } catch {
        if (!alive) return;
        setCanSeeAdmin(false);
      }
    }

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, _session: Session | null) => refresh()
    );

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <footer className="px-6 py-4">
      <div className="flex items-center justify-end">
        {canSeeAdmin ? (
          <Link
            href="/admin/edge-permissions"
            className="inline-flex items-center rounded-md border px-2.5 py-2 text-sm text-[var(--to-ink-muted)] hover:text-[var(--to-ink)] hover:bg-[var(--to-surface)]"
            aria-label="Edge permissions"
            title="Edge permissions"
          >
            <Settings className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </footer>
  );
}
