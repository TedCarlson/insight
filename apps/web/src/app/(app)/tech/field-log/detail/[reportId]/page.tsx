// Replace the entire file:
// apps/web/src/app/(app)/tech/field-log/detail/[reportId]/page.tsx

import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/data/supabase/server";

export const runtime = "nodejs";

export default async function TechFieldLogDetailPage(props: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await props.params;

  const supabase = await supabaseServer();

  const { data, error } = await supabase.rpc("field_log_get_report_detail", {
    p_report_id: reportId,
  });

  if (error || !data) {
    notFound();
  }

  const detail = data as any;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Field Log Detail
        </div>
        <div className="mt-2 text-lg font-semibold">{detail.job_number ?? "Unknown Job"}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {detail.category_label ?? "Field Log"}
          {detail.subcategory_label ? ` • ${detail.subcategory_label}` : ""}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 space-y-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </div>
          <div className="mt-1 text-sm">{String(detail.status ?? "").replaceAll("_", " ") || "—"}</div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Job Type
          </div>
          <div className="mt-1 text-sm">{detail.job_type ?? "—"}</div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Comment
          </div>
          <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
            {detail.comment ?? "No comment provided."}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Photos
          </div>
          <div className="mt-1 text-sm">{detail.photo_count ?? 0}</div>
        </div>

        {detail.followup_note ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Follow-Up Note
            </div>
            <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {detail.followup_note}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}