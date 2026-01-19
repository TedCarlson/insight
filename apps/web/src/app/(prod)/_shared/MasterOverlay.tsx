// apps/web/src/app/(prod)/_shared/MasterOverlay.tsx

import Link from "next/link";
import type { ReactNode } from "react";

export type OverlayTabKey = "roster" | "planning" | "metrics";

export function safeOverlayTab(v: unknown): OverlayTabKey {
  if (v === "planning" || v === "metrics" || v === "roster") return v;
  return "roster";
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

  const tabStyle = (tab: OverlayTabKey): React.CSSProperties => {
    const isActive = activeTab === tab;

    return {
      borderColor: isActive ? "var(--to-accent, var(--to-border))" : "var(--to-border)",
      background: isActive ? "var(--to-surface-2)" : "transparent",
      color: "var(--to-ink)",
      // subtle “selected” lift without screaming color
      boxShadow: isActive ? "0 1px 0 rgba(0,0,0,0.04)" : "none",
    };
  };

  return (
    <main className="flex h-full flex-col">
      <header
        className="border-b px-6 py-5"
        style={{
          borderColor: "var(--to-border)",
          background: "var(--to-surface)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--to-ink)]">{title}</h1>
          </div>

          {headerRight ? <div className="pt-1">{headerRight}</div> : null}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={tabLink("roster")}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
            style={tabStyle("roster")}
          >
            Roster
          </Link>

          <Link
            href={tabLink("planning")}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
            style={tabStyle("planning")}
          >
            Planning
          </Link>

          <Link
            href={tabLink("metrics")}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
            style={tabStyle("metrics")}
          >
            Metrics
          </Link>
        </div>
      </header>

      <section className="flex-1 px-6 py-6">{children}</section>
    </main>
  );
}
