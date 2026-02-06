// apps/web/src/app/api/org/assignment/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

function pickPcOrgId(sel: any): string | null {
  const raw =
    sel?.pc_org_id ??
    sel?.pcOrgId ??
    sel?.pc_orgId ??
    sel?.selected_org_id ??
    sel?.selectedOrgId ??
    sel?.org_id ??
    sel?.orgId ??
    null;

  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();

    // Make this compatible with your actual helper signature + return type
    const sel = await (requireSelectedPcOrgServer as any)(sb);
    const pc_org_id = pickPcOrgId(sel);

    if (!pc_org_id) {
      return NextResponse.json({ ok: false, error: "No scoped org selected" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const sport: string | null = body?.sport ?? null;
    const team: string | null = body?.team ?? null;
    const member_user_id: string | null = body?.member_user_id ?? null;

    if (!sport || !team || !member_user_id) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: sport, team, member_user_id" },
        { status: 400 }
      );
    }

    // Create roster row using the signed-in user's server client (RLS applies)
    const { data: rosterRow, error: rosterErr } = await sb
      .from("pc_org_roster")
      .insert({
        pc_org_id,
        member_user_id,
        sport,
        team,
        role: "player",
        status: "active",
      })
      .select("*")
      .single();

    if (rosterErr) {
      return NextResponse.json({ ok: false, error: rosterErr.message }, { status: 400 });
    }

    // Create assignment using service role (elevated perms)
    const service = supabaseAdmin();
    const { data: assignment, error: assignErr } = await service
      .from("pc_assignment")
      .insert({
        pc_org_id,
        member_user_id,
        roster_id: (rosterRow as any).id,
        status: "active",
      })
      .select("*")
      .single();

    if (assignErr) {
      return NextResponse.json(
        {
          ok: true,
          warning: "Roster created but assignment failed",
          assignment_error: assignErr.message,
          roster_row: rosterRow,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, assignment_id: (assignment as any).id, roster_row: rosterRow }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}