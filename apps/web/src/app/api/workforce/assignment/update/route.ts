// path: apps/web/src/app/api/workforce/assignment/update/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

type SeatType = "FIELD" | "LEADERSHIP" | "SUPPORT" | "TRAVEL";

type RequestBody = {
  assignment_id: string;
  changes: {
    position_title?: string | null;
    office_id?: string | null;
    reports_to_assignment_id?: string | null;
    start_date?: string | null;
    seat_type?: SeatType;
  };
};

function isSeatType(value: unknown): value is SeatType {
  return (
    value === "FIELD" ||
    value === "LEADERSHIP" ||
    value === "SUPPORT" ||
    value === "TRAVEL"
  );
}

export async function POST(req: Request) {
  const userClient = await supabaseServer();
  const adminClient = await supabaseAdmin();

  const {
    data: { user },
  } = await userClient.auth.getUser();

  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { assignment_id, changes } = body;

  if (!assignment_id || !changes) {
    return NextResponse.json(
      { error: "Missing assignment_id or changes" },
      { status: 400 }
    );
  }

  if ("seat_type" in changes && !isSeatType(changes.seat_type)) {
    return NextResponse.json({ error: "Invalid seat_type" }, { status: 400 });
  }

  const { data, error } = await adminClient.rpc("workforce_update_assignment", {
    p_assignment_id: assignment_id,
    p_position_title:
      "position_title" in changes ? changes.position_title : null,
    p_office_id: "office_id" in changes ? changes.office_id : null,
    p_reports_to_assignment_id:
      "reports_to_assignment_id" in changes
        ? changes.reports_to_assignment_id
        : null,
    p_start_date: "start_date" in changes ? changes.start_date : null,
    p_role_type: "seat_type" in changes ? changes.seat_type : null,
    p_auth_user_id: user?.id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.ok) {
    return NextResponse.json(
      { error: data?.error ?? "Unable to update assignment" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}