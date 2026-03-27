import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { resolveFiscalSelection } from "@/shared/kpis/core/rowSelection";

import type { MetricsRangeKey, RawMetricRow } from "@/shared/kpis/core/types";

type Args = {
  person_id: string;
  tech_id: string;
  range: MetricsRangeKey;
};

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function computeFtr(contact: number, fails: number): number {
  if (contact > 0) return 100 * (1 - fails / contact);
  if (fails > 0) return 0;
  return 0;
}

function parseRaw(raw: unknown): Record<string, unknown> {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export async function getMetricFtrPayload(args: Args) {
  const scope = await requireSelectedPcOrgServer();
  if (!scope.ok) return null;

  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("metrics_raw_row")
    .select("metric_date,fiscal_end_date,batch_id,inserted_at,raw")
    .eq("pc_org_id", scope.selected_pc_org_id)
    .eq("tech_id", args.tech_id)
    .order("fiscal_end_date", { ascending: false })
    .order("metric_date", { ascending: false })
    .order("inserted_at", { ascending: false })
    .order("batch_id", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(`getMetricFtrPayload failed: ${error.message}`);
  }

  const rows: RawMetricRow[] = (data ?? []).map((r: any) => ({
    metric_date: String(r.metric_date ?? "").slice(0, 10),
    fiscal_end_date: String(r.fiscal_end_date ?? "").slice(0, 10),
    batch_id: String(r.batch_id ?? ""),
    inserted_at: String(r.inserted_at ?? ""),
    raw: parseRaw(r.raw),
  }));

  if (!rows.length) return null;

  const {
    finalRowsByMonth,
    selectedFinalRows,
    selectedFiscalMonths,
  } = resolveFiscalSelection(rows, args.range);

  let totalContact = 0;
  let totalFails = 0;

  for (const item of selectedFinalRows) {
    const r = item.row;

    const contact = pickNum(r.raw, [
      "Total FTR/Contact Jobs",
      "total_ftr_contact_jobs",
      "ftr_contact_jobs",
    ]);

    const fails = pickNum(r.raw, [
      "FTRFailJobs",
      "ftr_fail_jobs",
      "FTR Fail Jobs",
    ]);

    if (contact != null && contact > 0) {
      totalContact += contact;
      totalFails += fails ?? 0;
    } else if (fails != null && fails > 0) {
      totalFails += fails;
    }
  }

  const summaryFtr =
    totalContact > 0
      ? computeFtr(totalContact, totalFails)
      : totalFails > 0
        ? 0
        : null;

  const monthFinalMap = new Set(
    selectedFinalRows.map(
      (x) =>
        `${x.row.fiscal_end_date}::${x.row.metric_date}::${x.row.inserted_at}::${x.row.batch_id}`
    )
  );

  const trend = rows
    .filter((r) => selectedFiscalMonths.has(r.fiscal_end_date))
    .map((r) => {
      const contact = pickNum(r.raw, [
        "Total FTR/Contact Jobs",
        "total_ftr_contact_jobs",
        "ftr_contact_jobs",
      ]);

      const fails = pickNum(r.raw, [
        "FTRFailJobs",
        "ftr_fail_jobs",
        "FTR Fail Jobs",
      ]);

      let ftr: number | null = null;

      if (contact != null && contact > 0) {
        ftr = computeFtr(contact, fails ?? 0);
      } else if (fails != null && fails > 0) {
        ftr = 0;
      }

      return {
        fiscal_end_date: r.fiscal_end_date,
        metric_date: r.metric_date,
        batch_id: r.batch_id,
        inserted_at: r.inserted_at,
        total_ftr_contact_jobs: contact,
        ftr_fail_jobs: fails,
        kpi_value: ftr,
        is_month_final: monthFinalMap.has(
          `${r.fiscal_end_date}::${r.metric_date}::${r.inserted_at}::${r.batch_id}`
        ),
      };
    })
    .sort((a, b) => {
      const byFiscal = a.fiscal_end_date.localeCompare(b.fiscal_end_date);
      if (byFiscal !== 0) return byFiscal;

      const byMetric = a.metric_date.localeCompare(b.metric_date);
      if (byMetric !== 0) return byMetric;

      const byInsertedAt = a.inserted_at.localeCompare(b.inserted_at);
      if (byInsertedAt !== 0) return byInsertedAt;

      return a.batch_id.localeCompare(b.batch_id);
    });

  return {
    debug: {
      requested_range: args.range,
      distinct_fiscal_month_count: finalRowsByMonth.length,
      distinct_fiscal_months_found: finalRowsByMonth.map((x) => x.fiscal_end_date),
      selected_month_count: selectedFinalRows.length,
      selected_final_rows: selectedFinalRows.map((x) => {
        const contact = pickNum(x.row.raw, [
          "Total FTR/Contact Jobs",
          "total_ftr_contact_jobs",
          "ftr_contact_jobs",
        ]);

        const fails = pickNum(x.row.raw, [
          "FTRFailJobs",
          "ftr_fail_jobs",
          "FTR Fail Jobs",
        ]);

        return {
          fiscal_end_date: x.row.fiscal_end_date,
          metric_date: x.row.metric_date,
          batch_id: x.row.batch_id,
          inserted_at: x.row.inserted_at,
          rows_in_month: x.rows_in_month,
          total_ftr_contact_jobs: contact,
          ftr_fail_jobs: fails,
        };
      }),
      trend,
    },
    summary: {
      ftr_rate: summaryFtr,
      total_contact_jobs: totalContact,
      total_fail_jobs: totalFails,
    },
    trend,
  };
}