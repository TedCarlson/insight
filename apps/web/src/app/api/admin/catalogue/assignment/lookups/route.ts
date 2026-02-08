import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();

  const [people, pcOrgs, offices, titles] = await Promise.all([
    admin.from("person").select("person_id, full_name").order("full_name", { ascending: true }).limit(5000),
    admin.from("pc_org").select("pc_org_id, pc_org_name").order("pc_org_name", { ascending: true }).limit(5000),
    admin.from("office").select("office_id, office_name, active").order("office_name", { ascending: true }).limit(5000),
    admin
      .from("position_title")
      .select("position_title, active, sort_order")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .limit(5000),
  ]);

  const firstErr = people.error || pcOrgs.error || offices.error || titles.error;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 500 });

  return NextResponse.json({
    person: (people.data ?? []).map((r: any) => ({
      id: String(r.person_id),
      label: String(r.full_name ?? r.person_id),
      sublabel: String(r.person_id),
    })),

    pc_org: (pcOrgs.data ?? []).map((r: any) => ({
      id: String(r.pc_org_id),
      label: String(r.pc_org_name ?? r.pc_org_id),
      sublabel: String(r.pc_org_id),
    })),

    // active-only offices (soft close support)
    office: (offices.data ?? [])
      .filter((o: any) => o.active !== false)
      .map((r: any) => ({
        id: String(r.office_id),
        label: String(r.office_name ?? r.office_id),
        sublabel: String(r.office_id),
      })),

    position_title: (titles.data ?? [])
      .filter((t: any) => t.active !== false)
      .map((t: any) => ({
        id: String(t.position_title),
        label: String(t.position_title),
      })),
  });
}