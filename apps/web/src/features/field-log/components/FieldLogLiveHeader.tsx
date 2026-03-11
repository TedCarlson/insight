"use client";

import { RotateCw } from "lucide-react";

type FieldLogLiveHeaderProps = {
  eyebrow?: string;
  title: string;
  freshnessText: string;
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
};

export function FieldLogLiveHeader(props: FieldLogLiveHeaderProps) {
  const { eyebrow = "Field Log", title, freshnessText, refreshing, onRefresh } = props;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{eyebrow}</div>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            {freshnessText}
          </div>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted disabled:opacity-60"
          >
            <RotateCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}