import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { requireModule } from "@/shared/access/access";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    pc_org_id,
    tech_id,
    shift_date,
    exception_type,
    force_off,
    override_route_id,
    override_hours,
    override_units,
    notes,
  } = body;

  if (!pc_org_id || !tech_id || !shift_date) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const sb = await supabaseServer();

  const { data: user } = await sb.auth.getUser();

  const { error } = await sb.from("schedule_exception_day").insert({
    pc_org_id,
    tech_id,
    shift_date,
    exception_type: exception_type ?? "MANUAL",
    force_off: force_off ?? false,
    override_route_id: override_route_id ?? null,
    override_hours: override_hours ?? null,
    override_units: override_units ?? null,
    notes: notes ?? null,
    requested_by: user?.user?.id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}