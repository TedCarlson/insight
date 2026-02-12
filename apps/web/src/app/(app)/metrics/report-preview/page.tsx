// apps/web/src/app/(app)/metrics/report-preview/page.tsx

import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/data/supabase/server";
import MetricsReportPreviewPage from "@/features/metrics-reports/pages/MetricsReportPreviewPage";

export const runtime = "nodejs";

export default async function ReportPreviewPage() {
  const supabase = await supabaseServer();

  // Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Owner gate
  const { data: isOwner, error: ownerError } = await supabase.rpc("is_owner");
  if (ownerError || !isOwner) redirect("/");

  // Load the 3 “source of truth” tables you edit in Metrics Admin
  const [kpiRes, cfgRes, rubRes] = await Promise.all([
    supabase.from("metrics_kpi_def").select("*").order("kpi_key", { ascending: true }),
    supabase
      .from("metrics_class_kpi_config")
      .select("*")
      .order("class_type", { ascending: true })
      .order("kpi_key", { ascending: true }),
    supabase
      .from("metrics_class_kpi_rubric")
      .select("*")
      .order("class_type", { ascending: true })
      .order("kpi_key", { ascending: true })
      .order("band_key", { ascending: true }),
  ]);

  // Fail closed (no mystery partial state)
  if (kpiRes.error || cfgRes.error || rubRes.error) {
    console.error("report-preview load error:", {
      kpi: kpiRes.error ?? null,
      cfg: cfgRes.error ?? null,
      rub: rubRes.error ?? null,
    });
    redirect("/admin/metrics");
  }

  return (
    <div className="w-full space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Report Preview</h1>
        <p className="text-sm text-muted-foreground">
          Enter sample KPI values to verify banding + scoring against your saved rubric.
        </p>
      </header>

      <MetricsReportPreviewPage
        initial={{
          kpiDefs: kpiRes.data ?? [],
          classConfig: cfgRes.data ?? [],
          rubricRows: rubRes.data ?? [],
        }}
      />
    </div>
  );
}