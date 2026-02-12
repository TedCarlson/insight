import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

import MetricsConsoleGrid from "@/features/metrics-admin/components/MetricsConsoleGrid";

type InitialPayload = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

type MsoOption = {
  mso_id: string;
  mso_name: string | null;
  mso_lob: string | null;
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
  // MSO Options (source of truth = "mso" table, same as Admin Catalogue)
  // -------------------------------------------------------------------
  const admin = supabaseAdmin();

  const { data: msoRows, error: msoErr } = await admin
    .from("mso")
    .select("mso_id,mso_name,mso_lob")
    .order("mso_name", { ascending: true });

  if (msoErr) {
    console.error("Failed to load MSO options:", {
      message: msoErr.message,
      code: (msoErr as any).code,
      details: (msoErr as any).details,
      hint: (msoErr as any).hint,
    });
  }

  const msoOptions: MsoOption[] =
    (msoRows ?? []).map((r: any) => ({
      mso_id: String(r?.mso_id ?? "").trim(),
      mso_name: r?.mso_name ?? null,
      mso_lob: r?.mso_lob ?? null,
    })) ?? [];

  const filteredOptions = msoOptions.filter((o) => o.mso_id);
  const initialMsoId: string | null = filteredOptions.length === 1 ? filteredOptions[0].mso_id : null;

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
  // Fetch Rubric Rows (MSO scoped)
  // If there is exactly one MSO, preload it. Otherwise start empty and
  // the client selector will load by MSO.
  // -------------------------------------------------------------------
  let rubricRows: any[] = [];
  if (initialMsoId) {
    const { data: rubData, error: rubricError } = await supabase
      .from("metrics_class_kpi_rubric")
      .select("*")
      .eq("mso_id", initialMsoId)
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
    } else {
      rubricRows = rubData ?? [];
    }
  }

  const initial: InitialPayload = {
    kpiDefs: kpiDefs ?? [],
    classConfig: classConfig ?? [],
    rubricRows: rubricRows ?? [],
  };

  return (
    <div className="w-full space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Metrics Console</h1>
        <p className="text-sm text-muted-foreground">
          Configure rubric ranges, weights, and KPI inclusion by class.
        </p>
      </header>

      <MetricsConsoleGrid initial={initial} initialMsoId={initialMsoId} msoOptions={filteredOptions} />
    </div>
  );
}