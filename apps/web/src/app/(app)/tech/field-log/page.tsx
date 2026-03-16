// apps/web/src/app/(app)/tech/field-log/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { useSession } from "@/state/session";

type MineRow = {
  report_id: string;
  status: string;
  category_label: string | null;
  subcategory_label: string | null;
  job_number: string;
  job_type: string | null;
  submitted_at: string | null;
  photo_count: number;
  edit_unlocked: boolean;
  followup_note: string | null;
};

type MineResponse = {
  ok: boolean;
  data?: MineRow[];
  error?: string;
};

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function buildBorderStyle(colors: string[]) {
  if (colors.length <= 1) {
    return { background: colors[0] ?? "rgb(34 197 94)" };
  }

  const stops = colors.map((color, index) => {
    const start = (index / colors.length) * 100;
    const end = ((index + 1) / colors.length) * 100;
    return `${color} ${start}% ${end}%`;
  });

  return {
    background: `linear-gradient(to bottom, ${stops.join(", ")})`,
  };
}

function getMyLogsBorderColors(rows: MineRow[]) {
  if (rows.length === 0) {
    return ["rgb(34 197 94)"];
  }

  let hasFollowup = false;
  let hasReviewPending = false;
  let hasApproved = false;

  for (const row of rows) {
    const status = String(row.status ?? "").toLowerCase();

    if (status === "tech_followup_required") {
      hasFollowup = true;
      continue;
    }

    if (status === "approved") {
      hasApproved = true;
      continue;
    }

    hasReviewPending = true;
  }

  const colors: string[] = [];
  if (hasFollowup) colors.push("rgb(239 68 68)");
  if (hasReviewPending) colors.push("rgb(59 130 246)");
  if (hasApproved || colors.length === 0) colors.push("rgb(34 197 94)");
  return colors;
}

function getMyLogsDetail(rows: MineRow[]) {
  if (rows.length === 0) {
    return "All clear right now.";
  }

  let followup = 0;
  let reviewPending = 0;
  let approved = 0;

  for (const row of rows) {
    const status = String(row.status ?? "").toLowerCase();

    if (status === "tech_followup_required") {
      followup += 1;
      continue;
    }

    if (status === "approved") {
      approved += 1;
      continue;
    }

    reviewPending += 1;
  }

  const parts: string[] = [];
  if (followup > 0) parts.push(`${followup} follow-up`);
  if (reviewPending > 0) parts.push(`${reviewPending} pending review`);
  if (approved > 0) parts.push(`${approved} approved`);

  return parts.join(" • ");
}

function ActionTile(props: {
  href: string;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  borderColors: string[];
}) {
  const Icon = props.icon;
  const borderStyle = buildBorderStyle(props.borderColors);

  return (
    <Link
      href={props.href}
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card px-4 py-4 transition hover:bg-muted/40 active:scale-[0.99]"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={borderStyle}
        aria-hidden="true"
      />

      <div className="pl-1">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <div className="text-sm font-medium">{props.label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{props.detail}</div>
      </div>
    </Link>
  );
}

export default function TechFieldLogPage() {
  const { userId } = useSession();
  const [rows, setRows] = useState<MineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/field-log/mine?createdByUserId=${encodeURIComponent(userId)}`,
          { method: "GET", cache: "no-store" }
        );
        const json = (await res.json()) as MineResponse;

        if (!cancelled && res.ok && json.ok) {
          setRows(json.data ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const myLogsBorderColors = useMemo(() => getMyLogsBorderColors(rows), [rows]);
  const myLogsDetail = useMemo(() => {
    if (loading) return "Checking log status…";
    return getMyLogsDetail(rows);
  }, [loading, rows]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Field Log
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Start a new submission or open your existing logs.
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3">
        <ActionTile
          href="/tech/field-log/new"
          label="New Field Log"
          detail="Start a new field submission."
          icon={FilePlus2}
          borderColors={["rgb(34 197 94)"]}
        />

        <ActionTile
          href="/tech/field-log/mine"
          label="My Logs"
          detail={myLogsDetail}
          icon={ClipboardList}
          borderColors={myLogsBorderColors}
        />
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Border Guide
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Red = follow-up priority • Blue = review pending • Green = approved / all clear
        </div>
      </section>
    </div>
  );
}