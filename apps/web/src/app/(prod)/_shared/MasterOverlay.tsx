// apps/web/src/app/(prod)/_shared/MasterOverlay.tsx

import Link from "next/link";
import type { ReactNode } from "react";

export type OverlayTabKey = "roster" | "planning" | "metrics";

export function safeOverlayTab(v: unknown): OverlayTabKey {
  if (v === "planning" || v === "metrics" || v === "roster") return v;
  return "roster";
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function MasterOverlay(props: {
  title: string;
  scopeLabel?: string; // kept for compatibility, intentionally not rendered
  activeTab: OverlayTabKey;
  baseHref: string; // e.g. "/org"
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const { title, activeTab, baseHref, headerRight, children } = props;

  const tabLink = (tab: OverlayTabKey) => `${baseHref}?tab=${tab}`;

  const tabClass = (tab: OverlayTabKey) => {
    const isActive = activeTab === tab;

    return cx(
      "rounded-md border px-4 py-2 text-sm font-medium transition",
      "text-[var(--to-ink)]",
      "hover:bg-[var(--to-surface-2)]",
      "focus:outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))] focus:ring-offset-2 focus:ring-offset-[var(--to-surface)]",
      isActive
        ? "border-[var(--to-accent,var(--to-border))] bg-[var(--to-surface-2)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
        : "border-[var(--to-border)] bg-transparent"
    );
  };

  return (
    <main className="flex h-full flex-col bg-[var(--to-surface)] text-[var(--to-ink)]">
      <header className="border-b border-[var(--to-border)] bg-[var(--to-surface)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[var(--to-ink)]">{title}</h1>
          </div>

          {headerRight ? <div className="pt-1">{headerRight}</div> : null}
        </div>

        {/* Tabs */}
        <nav aria-label="Overlay sections" className="mt-6 flex flex-wrap gap-3">
          <Link
            href={tabLink("roster")}
            className={tabClass("roster")}
            aria-current={activeTab === "roster" ? "page" : undefined}
          >
            Roster
          </Link>

          <Link
            href={tabLink("planning")}
            className={tabClass("planning")}
            aria-current={activeTab === "planning" ? "page" : undefined}
          >
            Planning
          </Link>

          <Link
            href={tabLink("metrics")}
            className={tabClass("metrics")}
            aria-current={activeTab === "metrics" ? "page" : undefined}
          >
            Metrics
          </Link>
        </nav>
      </header>

      <section className="flex-1 px-6 py-6">{children}</section>
    </main>
  );
}
