// apps/web/src/features/metrics-admin/pages/MetricsAdminPage.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/data/supabase/server";

import MetricsConsoleGrid from "@/features/metrics-admin/components/MetricsConsoleGrid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type InitialPayload = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

export default async function MetricsAdminPage() {
  const supabase = await supabaseServer();

  // -------------------------------------------------------------------
  // Auth Gate
  // -------------------------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // -------------------------------------------------------------------
  // Owner Gate
  // -------------------------------------------------------------------
  const { data: isOwnerData, error: ownerError } = await supabase.rpc("is_owner");

  if (ownerError || !isOwnerData) {
    redirect("/");
  }

  // -------------------------------------------------------------------
  // Fetch KPI Definitions (global)
  // -------------------------------------------------------------------
  const { data: kpiDefs, error: kpiError } = await supabase
    .from("metrics_kpi_def")
    .select("*")
    .order("kpi_key");

  if (kpiError) {
    console.error("Failed to load KPI definitions:", {
      message: kpiError.message,
      code: (kpiError as any).code,
      details: (kpiError as any).details,
      hint: (kpiError as any).hint,
    });
  }

  // -------------------------------------------------------------------
  // Fetch Class/KPI Config (global)
  // -------------------------------------------------------------------
  const { data: classConfig, error: configError } = await supabase
    .from("metrics_class_kpi_config")
    .select("*")
    .order("class_type")
    .order("kpi_key");

  if (configError) {
    console.error("Failed to load class config:", {
      message: configError.message,
      code: (configError as any).code,
      details: (configError as any).details,
      hint: (configError as any).hint,
    });
  }

  // -------------------------------------------------------------------
  // Fetch Rubric Rows (GLOBAL)
  // -------------------------------------------------------------------
  const { data: rubData, error: rubricError } = await supabase
    .from("metrics_class_kpi_rubric")
    .select("*")
    .order("class_type")
    .order("kpi_key")
    .order("band_key");

  if (rubricError) {
    console.error("Failed to load rubric rows:", {
      message: rubricError.message,
      code: (rubricError as any).code,
      details: (rubricError as any).details,
      hint: (rubricError as any).hint,
    });
  }

  const initial: InitialPayload = {
    kpiDefs: kpiDefs ?? [],
    classConfig: classConfig ?? [],
    rubricRows: rubData ?? [],
  };

  return (
    <div className="w-full space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Metrics Console</h1>
        <p className="text-sm text-muted-foreground">
          Configure rubric ranges, weights, and KPI inclusion by class.
        </p>
      </header>

      <MetricsConsoleGrid initial={initial} />
    </div>
  );
}