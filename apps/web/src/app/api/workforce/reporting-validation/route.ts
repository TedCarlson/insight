import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export async function GET() {
  const userClient = await supabaseServer();
  const admin = await supabaseAdmin();

  // 🔑 AUTH USER
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized - no user" },
      { status: 401 }
    );
  }

  // 🔑 CORRECT SOURCE OF TRUTH
  const { data: profile, error: profileError } = await admin
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      {
        error: "Failed to resolve user_profile",
        details: profileError.message,
      },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "No user_profile found for user" },
      { status: 400 }
    );
  }

  if (!profile.selected_pc_org_id) {
    return NextResponse.json(
      { error: "User has no selected_pc_org_id" },
      { status: 400 }
    );
  }

  const pcOrgId = profile.selected_pc_org_id;

  // 🔑 RPC CALL
  const { data, error } = await admin.rpc(
    "workforce_reporting_validation",
    { p_pc_org_id: pcOrgId }
  );

  if (error) {
    console.error("RPC ERROR:", error);

    return NextResponse.json(
      {
        error: error.message,
        details: error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    pc_org_id: pcOrgId,
    rows: data ?? [],
  });
}