// apps/web/src/features/roster/lib/rosterFormat.ts
import type { RosterRow } from "@/shared/lib/api";

export type RoleFilter = "technician" | "supervisor" | "all";

export function pickName(r: RosterRow): string {
  return (
    r.full_name ??
    r.person_name ??
    r.name ??
    [r.first_name, r.last_name].filter(Boolean).join(" ") ??
    r.email ??
    r.person_id ??
    "—"
  );
}

export function roleText(r: any): string {
  return String(r?.position_title ?? r?.title ?? r?.role_title ?? "").trim();
}

export function isSupervisorRow(r: any): boolean {
  return /supervisor/i.test(roleText(r));
}

export function isTechnicianRow(r: any): boolean {
  const t = roleText(r);
  if (/technician/i.test(t)) return true;
  return Boolean(String(r?.tech_id ?? "").trim()) && !isSupervisorRow(r);
}