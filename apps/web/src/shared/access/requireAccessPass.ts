import { NextRequest } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import type { AccessPass } from "@/shared/access/access";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function getRequestPcOrgId(req: NextRequest) {
  return String(req.nextUrl.searchParams.get("pc_org_id") ?? "").trim();
}

export async function requireAccessPass(
  req: NextRequest,
  pcOrgIdOverride?: string | null
): Promise<AccessPass> {
  const pcOrgId = String(pcOrgIdOverride ?? getRequestPcOrgId(req) ?? "").trim();

  if (!pcOrgId || !isUuid(pcOrgId)) {
    const err: any = new Error("invalid_pc_org_id");
    err.status = 400;
    throw err;
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    const err: any = new Error("unauthorized");
    err.status = 401;
    throw err;
  }

  const { data, error } = await supabase.rpc("get_access_pass", {
    p_pc_org_id: pcOrgId,
  });

  if (error || !data) {
    const err: any = new Error("access_pass_failed");
    err.status = 403;
    err.supabase = error ?? null;
    throw err;
  }

  return data as AccessPass;
}