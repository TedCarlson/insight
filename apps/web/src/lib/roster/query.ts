// apps/web/src/lib/roster/query.ts

import { supabaseServer } from "@/lib/supabase/server";
import type { RosterFilters, RosterOption, RosterRow } from "./types";

const VIEW = "v_roster_current";

const ROSTER_SELECT =
    "person_id," +
    "name,email,mobile,active_flag,last_updated," +
    "tech_id,schedule_name," +
    "presence_name,pc_name," +
    "mso_id,mso_name," +
    "company_id,company_name," +
    "contractor_id,contractor_name," +
    "division_id,division_name," +
    "region_id,region_name";

function norm(v: unknown) {
    return (v === null || v === undefined ? "" : String(v)).trim();
}

export async function fetchRoster(filters: RosterFilters) {
    const supabase = await supabaseServer();

    const limit = Math.max(1, Math.min(Number(filters.limit ?? 50), 250));
    const offset = Math.max(0, Number(filters.offset ?? 0));

    // Avoid exact counts on views; exact counts can be brutal under frequent nav.
    let q = supabase.from(VIEW).select(ROSTER_SELECT, { count: "estimated" });

    if (filters.active === "1") q = q.eq("active_flag", true);
    if (filters.active === "0") q = q.eq("active_flag", false);

    if (filters.hasTech === "1") q = q.not("tech_id", "is", null);
    if (filters.hasTech === "0") q = q.is("tech_id", null);

    if (filters.mso) q = q.eq("mso_id", filters.mso);
    if (filters.contractor) q = q.eq("contractor_id", filters.contractor);

    const search = norm(filters.q);

    // Narrow search surface + ignore short prefixes (prevents expensive ilike scans)
    if (search.length >= 3) {
        const needle = `%${search}%`;
        q = q.or(
            [
                `name.ilike.${needle}`,
                `tech_id.ilike.${needle}`,
                `email.ilike.${needle}`,
            ].join(",")
        );
    }

    q = q
        .order("name", { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
        rows: (data ?? []) as unknown as RosterRow[],
        count: count ?? 0,
        limit,
        offset,
    };
}

export async function fetchRosterFilterOptions() {
    const supabase = await supabaseServer();

    const { data, error } = await supabase
        .from(VIEW)
        .select("mso_id,mso_name,contractor_id,contractor_name")
        .limit(5000);

    if (error) throw error;

    const msoMap = new Map<string, string>();
    const contractorMap = new Map<string, string>();

    for (const row of data ?? []) {
        if ((row as any).mso_id) msoMap.set(String((row as any).mso_id), String((row as any).mso_name ?? (row as any).mso_id));
        if ((row as any).contractor_id)
            contractorMap.set(
                String((row as any).contractor_id),
                String((row as any).contractor_name ?? (row as any).contractor_id)
            );
    }

    const msos: RosterOption[] = Array.from(msoMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const contractors: RosterOption[] = Array.from(contractorMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return { msos, contractors };
}
