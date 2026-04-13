// apps/web/src/app/api/metrics/process-batch/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { hasCapability } from "@/shared/access/access";
import { CAP } from "@/shared/access/capabilities";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

type EngineLane = "NSR" | "SMART";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function normalizeLane(value: unknown): EngineLane {
  const upper = String(value ?? "NSR").trim().toUpperCase();
  if (upper === "SMART") return "SMART";
  return "NSR";
}

function toPendingBatchStatus(lane: EngineLane) {
  return lane === "SMART" ? "smart_pending" : "nsr_pending";
}

function isEligible(status: string | null, lane: EngineLane) {
  const s = String(status ?? "").trim().toLowerCase();

  if (lane === "NSR") {
    return (
      s === "loaded" ||
      s === "nsr_failed" ||
      s === "smart_failed" ||
      s === "smart_complete"
    );
  }

  return s === "nsr_complete" || s === "smart_failed";
}

function hasPendingJob(
  rows: Array<{ status: string | null; lane: string | null }>,
  lane: EngineLane
) {
  const target = lane.toLowerCase();
  return rows.some((row) => {
    const status = String(row.status ?? "").trim().toLowerCase();
    const jobLane = String(row.lane ?? "").trim().toLowerCase();
    return (
      jobLane === target && (status === "pending" || status === "running")
    );
  });
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
      return json(500, { ok: false, error: "missing env" });
    }

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const admin = supabaseAdmin();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return json(401, { ok: false, error: "unauthorized" });
    }

    const { data: prof, error: profErr } = await supabase
      .from("user_profile")
      .select("selected_pc_org_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profErr) {
      return json(500, { ok: false, error: profErr.message });
    }

    const pc_org_id = (prof?.selected_pc_org_id as string | null) ?? null;
    if (!pc_org_id) {
      return json(400, { ok: false, error: "no org selected" });
    }

    const pass = await requireAccessPass(req, pc_org_id);
    const allowed =
      hasCapability(pass, CAP.METRICS_MANAGE) ||
      hasCapability(pass, CAP.ROSTER_MANAGE) ||
      pass.is_owner ||
      pass.is_admin;

    if (!allowed) {
      return json(403, {
        ok: false,
        error: "forbidden",
        required_any_of: ["metrics_manage", "roster_manage"],
      });
    }

    const body = await req.json().catch(() => null);
    const batch_id = String(body?.batch_id ?? "").trim();
    const lane = normalizeLane(body?.lane);

    if (!batch_id) {
      return json(400, { ok: false, error: "missing batch_id" });
    }

    const { data: batchRow, error: batchErr } = await admin
      .from("metrics_raw_batch")
      .select("batch_id, pc_org_id, status")
      .eq("batch_id", batch_id)
      .maybeSingle();

    if (batchErr) {
      return json(500, { ok: false, error: batchErr.message });
    }

    if (!batchRow) {
      return json(404, { ok: false, error: "batch not found" });
    }

    if (String(batchRow.pc_org_id) !== String(pc_org_id)) {
      return json(403, { ok: false, error: "forbidden" });
    }

    if (!isEligible(batchRow.status, lane)) {
      return json(400, {
        ok: false,
        error: "batch is not eligible for processing",
        detail: { status: batchRow.status, lane },
      });
    }

    const { data: existingJobs, error: existingJobsErr } = await admin
      .from("metrics_pipeline_queue")
      .select("status,lane")
      .eq("batch_id", batch_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (existingJobsErr) {
      return json(500, { ok: false, error: existingJobsErr.message });
    }

    if (
      !hasPendingJob(
        (existingJobs ?? []) as Array<{ status: string | null; lane: string | null }>,
        lane
      )
    ) {
      const pendingBatchStatus = toPendingBatchStatus(lane);

      const { error: batchUpdateErr } = await admin
        .from("metrics_raw_batch")
        .update({
          status: pendingBatchStatus,
          error: null,
        })
        .eq("batch_id", batch_id);

      if (batchUpdateErr) {
        return json(500, { ok: false, error: batchUpdateErr.message });
      }

      const { error: insertErr } = await admin
        .from("metrics_pipeline_queue")
        .insert({
          batch_id,
          lane,
          status: "pending",
        });

      if (insertErr) {
        return json(500, { ok: false, error: insertErr.message });
      }
    }

    // Kick two worker passes immediately
    const { error: workerErr1 } = await admin.rpc("process_next_metrics_job");
    if (workerErr1) {
      return json(500, { ok: false, error: workerErr1.message });
    }

    const { error: workerErr2 } = await admin.rpc("process_next_metrics_job");
    if (workerErr2) {
      return json(500, { ok: false, error: workerErr2.message });
    }

    const { data: refreshedBatch, error: refreshedBatchErr } = await admin
      .from("metrics_raw_batch")
      .select("batch_id, status, error")
      .eq("batch_id", batch_id)
      .maybeSingle();

    if (refreshedBatchErr) {
      return json(500, { ok: false, error: refreshedBatchErr.message });
    }

    return json(200, {
      ok: true,
      queued: true,
      batch_id,
      lane,
      status: refreshedBatch?.status ?? null,
      error: refreshedBatch?.error ?? null,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message ?? e) });
  }
}