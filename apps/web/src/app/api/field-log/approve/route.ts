// Replace the entire file:
// apps/web/src/app/api/field-log/approve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";

export const runtime = "nodejs";

type ApproveBody = {
  reportId?: string;
  actionByUserId?: string;
  note?: string | null;
  xmLink?: string | null;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function isMissingApproveSignature(message: string) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("could not find the function public.field_log_approve_report") ||
    text.includes("function public.field_log_approve_report")
  );
}

export async function POST(req: NextRequest) {
  let body: ApproveBody;

  try {
    body = (await req.json()) as ApproveBody;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const reportId = body.reportId?.trim();
  const actionByUserId = body.actionByUserId?.trim();
  const xmLink = body.xmLink?.trim() || null;
  const note = body.note?.trim() || null;

  if (!reportId) {
    return badRequest("reportId is required.");
  }

  if (!actionByUserId) {
    return badRequest("actionByUserId is required.");
  }

  const supabase = await supabaseServer();

  if (xmLink) {
    const { error: xmError } = await supabase.rpc("field_log_append_xm_link", {
      p_report_id: reportId,
      p_action_by_user_id: actionByUserId,
      p_xm_link: xmLink,
      p_note: note,
    });

    if (xmError) {
      return NextResponse.json(
        { ok: false, error: xmError.message || "Failed to append XM link." },
        { status: 500 },
      );
    }
  }

  let data: unknown = null;

  const approveWithXm = await supabase.rpc("field_log_approve_report", {
    p_report_id: reportId,
    p_action_by_user_id: actionByUserId,
    p_note: note,
    p_xm_link: xmLink,
  });

  if (!approveWithXm.error) {
    data = approveWithXm.data;
    return NextResponse.json({ ok: true, data });
  }

  if (!isMissingApproveSignature(approveWithXm.error.message || "")) {
    return NextResponse.json(
      {
        ok: false,
        error: approveWithXm.error.message || "Failed to approve Field Log report.",
      },
      { status: 500 },
    );
  }

  const approveLegacy = await supabase.rpc("field_log_approve_report", {
    p_report_id: reportId,
    p_action_by_user_id: actionByUserId,
    p_note: note,
  });

  if (approveLegacy.error) {
    return NextResponse.json(
      {
        ok: false,
        error: approveLegacy.error.message || "Failed to approve Field Log report.",
      },
      { status: 500 },
    );
  }

  data = approveLegacy.data;
  return NextResponse.json({ ok: true, data });
}