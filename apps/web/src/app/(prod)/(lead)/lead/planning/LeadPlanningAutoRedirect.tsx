//apps/web/src/app/(prod)/(lead)/lead/planning/LeadPlanningAutoRedirect.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchDefaultPcOrgIdForCurrentUser } from "@/app/(prod)/_shared/dropdowns";

export function LeadPlanningAutoRedirect() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    fetchDefaultPcOrgIdForCurrentUser()
      .then((pcOrgId) => {
        if (cancelled) return;
        if (!pcOrgId) {
          setStatus("missing");
          return;
        }
        router.replace(`/lead/planning?pc_org_id=${encodeURIComponent(pcOrgId)}`);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
      <div className="text-sm font-semibold">Planning</div>

      {status === "loading" ? (
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">Resolving default PC Org…</div>
      ) : status === "missing" ? (
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Missing <code className="text-xs">pc_org_id</code> and no default could be inferred for your account.
        </div>
      ) : (
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Could not resolve a default PC Org due to an unexpected error.
        </div>
      )}
    </div>
  );
}
