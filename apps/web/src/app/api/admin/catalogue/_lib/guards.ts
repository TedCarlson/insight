import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export async function requireAdmin() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // simple: reuse your existing admin gate
  // (replace later with permission-key check if desired)
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("admin_permission_grant")
    .select("permission_key")
    .eq("auth_user_id", user.id)
    .limit(1);

  if (error || !data?.length) {
    throw new Error("Forbidden");
  }

  return { user, admin };
}