import { bootstrapProfileServer } from "@/lib/auth/bootstrapProfile.server";

type RequireSelectedPcOrgOk = {
  ok: true;
  selected_pc_org_id: string;
  boot: Awaited<ReturnType<typeof bootstrapProfileServer>>;
};

type RequireSelectedPcOrgErr = {
  ok: false;
  reason: "not_authenticated" | "no_selected_pc_org";
  boot: Awaited<ReturnType<typeof bootstrapProfileServer>>;
};

export type RequireSelectedPcOrgResult = RequireSelectedPcOrgOk | RequireSelectedPcOrgErr;

/**
 * Server-only helper to enforce a selected pc_org_id for v2 surfaces.
 * Centralizes the scoping contract to prevent drift across pages.
 */
export async function requireSelectedPcOrgServer(): Promise<RequireSelectedPcOrgResult> {
  const boot = await bootstrapProfileServer();

  if (!boot.ok) {
    return { ok: false, reason: "not_authenticated", boot };
  }

  const pcOrgId = boot.selected_pc_org_id;

  if (!pcOrgId) {
    return { ok: false, reason: "no_selected_pc_org", boot };
  }

  return { ok: true, selected_pc_org_id: pcOrgId, boot };
}
