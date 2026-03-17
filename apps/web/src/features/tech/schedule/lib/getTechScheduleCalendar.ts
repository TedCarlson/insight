import { getTechShellContext } from "@/features/tech/lib/getTechShellContext";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export type TechScheduleCalendarPayload = {
  ok: boolean;
  reason: "ok" | "no_org" | "no_auth_user" | "no_person" | "no_active_assignment";
  monthLabel: string;
  year: number;
  month: number; // 0-based
  todayIso: string;
  scheduledDates: Set<string>;
};

function isoTodayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoUtc(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function monthEndIsoUtc(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
}

function monthLabelUtc(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function getTechScheduleCalendar(): Promise<TechScheduleCalendarPayload> {
  const shell = await getTechShellContext();

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const todayIso = isoTodayUtc();
  const startIso = monthStartIsoUtc(year, month);
  const endIso = monthEndIsoUtc(year, month);

  if (!shell.ok || !shell.pc_org_id || !shell.assignment_id) {
    return {
      ok: false,
      reason: shell.reason,
      monthLabel: monthLabelUtc(year, month),
      year,
      month,
      todayIso,
      scheduledDates: new Set<string>(),
    };
  }

  const admin = supabaseAdmin();

  const { data: rows, error } = await admin
    .from("schedule_day_fact")
    .select("shift_date")
    .eq("pc_org_id", shell.pc_org_id)
    .eq("assignment_id", shell.assignment_id)
    .gte("shift_date", startIso)
    .lte("shift_date", endIso)
    .order("shift_date", { ascending: true });

  if (error) {
    throw new Error(`schedule_day_fact lookup failed: ${error.message}`);
  }

  return {
    ok: true,
    reason: "ok",
    monthLabel: monthLabelUtc(year, month),
    year,
    month,
    todayIso,
    scheduledDates: new Set(
      (rows ?? [])
        .map((row: { shift_date: string | null }) => String(row.shift_date ?? "").slice(0, 10))
        .filter(Boolean)
    ),
  };
}