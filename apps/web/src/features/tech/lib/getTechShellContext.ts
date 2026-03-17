import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

export type TechShellContext = {
  ok: boolean;
  pc_org_id: string | null;
  person_id: string | null;
  assignment_id: string | null;
  reason: "ok" | "no_org" | "no_auth_user" | "no_person" | "no_active_assignment";
};

type UserProfileRow = {
  person_id: string | null;
};

type AssignmentRow = {
  assignment_id: string | null;
};

export async function getTechShellContext(): Promise<TechShellContext> {
  const scope = await requireSelectedPcOrgServer();

  if (!scope.ok) {
    return {
      ok: false,
      pc_org_id: null,
      person_id: null,
      assignment_id: null,
      reason: "no_org",
    };
  }

  const pc_org_id = scope.selected_pc_org_id;
  const sb = await supabaseServer();
  const admin = supabaseAdmin();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user?.id) {
    return {
      ok: false,
      pc_org_id,
      person_id: null,
      assignment_id: null,
      reason: "no_auth_user",
    };
  }

  const auth_user_id = user.id;

  const { data: profileRow, error: profileError } = await admin
    .from("user_profile")
    .select("person_id")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle<UserProfileRow>();

  if (profileError) {
    throw new Error(`user_profile lookup failed: ${profileError.message}`);
  }

  const person_id = String(profileRow?.person_id ?? "").trim() || null;

  if (!person_id) {
    return {
      ok: false,
      pc_org_id,
      person_id: null,
      assignment_id: null,
      reason: "no_person",
    };
  }

  const { data: assignmentRow, error: assignmentError } = await admin
    .from("assignment")
    .select("assignment_id")
    .eq("pc_org_id", pc_org_id)
    .eq("person_id", person_id)
    .is("end_date", null)
    .limit(1)
    .maybeSingle<AssignmentRow>();

  if (assignmentError) {
    throw new Error(`assignment lookup failed: ${assignmentError.message}`);
  }

  const assignment_id = String(assignmentRow?.assignment_id ?? "").trim() || null;

  if (!assignment_id) {
    return {
      ok: false,
      pc_org_id,
      person_id,
      assignment_id: null,
      reason: "no_active_assignment",
    };
  }

  return {
    ok: true,
    pc_org_id,
    person_id,
    assignment_id,
    reason: "ok",
  };
}