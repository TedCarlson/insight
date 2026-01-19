// apps/web/src/app/(prod)/_shared/MasterOverlay.tsx
import Link from "next/link";

export type OverlayTabKey = "roster" | "planning" | "metrics" | "wire";

export function safeOverlayTab(v: unknown): OverlayTabKey {
  if (v === "planning" || v === "metrics" || v === "roster" || v === "wire") return v;
  return "roster";
}

export function MasterOverlay(props: {
  title: string;
  scopeLabel: string; // for now: "Manager scope (pc_org)" etc.
  activeTab: OverlayTabKey;
  baseHref: string; // e.g. "/org"
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { title, scopeLabel, activeTab, baseHref, headerRight, children } = props;

  const tabLink = (tab: OverlayTabKey) => `${baseHref}?tab=${tab}`;

  const tabStyle = (tab: OverlayTabKey) => ({
    borderColor: "var(--to-border)",
    background: activeTab === tab ? "var(--to-surface-2)" : "transparent",
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--to-ink)]">{title}</h1>
          <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
            {scopeLabel}. Active section:{" "}
            <span className="font-mono text-[var(--to-ink)]">{activeTab}</span>
          </p>
        </div>
        {headerRight ? <div className="pt-1">{headerRight}</div> : null}
      </div>

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

        <Link
          href={tabLink("wire")}
          className="rounded border px-4 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={tabStyle("wire")}
        >
          Wire
        </Link>
      </div>

      <section
        className="mt-6 rounded border p-4"
        style={{
          borderColor: "var(--to-border)",
          background: "var(--to-surface)",
        }}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
          Section
        </div>
        {children}
      </section>
    </main>
  );
}
