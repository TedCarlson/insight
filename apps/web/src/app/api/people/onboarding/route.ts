// path: apps/web/src/app/api/people/onboarding/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

export async function GET() {
  const userClient = await supabaseServer();
  const adminClient = await supabaseAdmin();

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await userClient
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const pcOrgId = profile?.selected_pc_org_id ?? null;

  if (!pcOrgId) {
    return NextResponse.json(
      { error: "No selected PC org found" },
      { status: 400 }
    );
  }

  const { data, error } = await adminClient.rpc("people_onboarding_list_v2", {
    p_pc_org_id: pcOrgId,
    p_limit: 500,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}