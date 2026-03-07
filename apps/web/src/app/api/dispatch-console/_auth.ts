import { type NextRequest } from "next/server";

import { supabaseServer } from "@/shared/data/supabase/server";
import { bootstrapProfileServer } from "@/shared/lib/auth/bootstrapProfile.server";

import { requireAccessPass } from "@/shared/access/requireAccessPass";
import { requireModule } from "@/shared/access/access";

type DispatchAccessOk = {
  ok: true;
  status: 200;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  boot: Awaited<ReturnType<typeof bootstrapProfileServer>>;
  access: {
    isOwner: boolean;
    isItg: boolean;
    isBp: boolean;
  };
  pass: any;
  auth_user_id: string;
  pc_org_id: string;
};

type DispatchAccessFail = {
  ok: false;
  status: number;
  error: string;
};

function fail(status: number, error: string): DispatchAccessFail {
  return { ok: false, status, error };
}

export async function requireDispatchConsoleAccess(
  req?: NextRequest,
  pc_org_id?: string
): Promise<DispatchAccessOk | DispatchAccessFail> {
  const sb = await supabaseServer();
  const boot = await bootstrapProfileServer();

  if (!boot.ok || !boot.auth_user_id) {
    return fail(401, "Unauthorized");
  }

  const effectivePcOrgId = String(pc_org_id ?? boot.selected_pc_org_id ?? "").trim();
  if (!effectivePcOrgId) {
    return fail(409, "No selected org");
  }

  try {
    let pass: any;

    if (req) {
      pass = await requireAccessPass(req, effectivePcOrgId);
    } else {
      const { data, error } = await sb.rpc("get_access_pass", {
        p_pc_org_id: effectivePcOrgId,
      });

      if (error || !data) {
        return fail(403, "Forbidden");
      }

      pass = data;
    }

    requireModule(pass, "dispatch_console");

    return {
      ok: true,
      status: 200,
      supabase: sb,
      boot,
      access: {
        isOwner: Boolean((pass as any)?.is_app_owner) || Boolean((pass as any)?.is_owner),
        isItg: false,
        isBp: false,
      },
      pass,
      auth_user_id: String(pass.auth_user_id ?? boot.auth_user_id),
      pc_org_id: effectivePcOrgId,
    };
  } catch (err: any) {
    const status = Number(err?.status ?? 500);

    if (status === 401) return fail(401, "Unauthorized");
    if (status === 403) return fail(403, "Forbidden");
    if (status === 400) return fail(400, String(err?.message ?? "invalid_pc_org_id"));
    return fail(500, "access_check_failed");
  }
}