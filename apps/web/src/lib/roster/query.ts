import { supabaseServer } from "@/lib/supabase/server";
import type { RosterFilters, RosterOption, RosterRow } from "./types";

const VIEW = "v_roster_current";

function toInt(v: string | undefined, d: number) {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) ? n : d;
}

export async function fetchRoster(filters: RosterFilters) {
    const supabase = await supabaseServer();

    const limit = Math.min(Math.max(toInt(filters.limit, 50), 10), 200);
    const offset = Math.max(toInt(filters.offset, 0), 0);

    let q = supabase.from(VIEW).select("*", { count: "exact" });

    // Defaults
    const active = filters.active ?? "1";
    if (active === "1") q = q.eq("active_flag", true);

    const hasTech = filters.hasTech ?? "0";
    if (hasTech === "1") q = q.not("tech_id", "is", null);

    if (filters.mso) q = q.eq("mso_id", filters.mso);
    if (filters.contractor) q = q.eq("contractor_id", filters.contractor);

    if (filters.q && filters.q.trim().length > 0) {
        const needle = `%${filters.q.trim()}%`;
        // broad human-friendly search
        q = q.or(
            [
                `name.ilike.${needle}`,
                `email.ilike.${needle}`,
                `mobile.ilike.${needle}`,
                `tech_id.ilike.${needle}`,
                `presence_name.ilike.${needle}`,
                `pc_name.ilike.${needle}`,
            ].join(",")
        );
    }

    q = q.order("name", { ascending: true, nullsFirst: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
        rows: (data ?? []) as RosterRow[],
        count: count ?? 0,
        limit,
        offset,
    };
}

export async function fetchRosterFilterOptions() {
    const supabase = await supabaseServer();

    // Pull small projection once; dedupe in app (MVP)
    const { data, error } = await supabase
        .from(VIEW)
        .select("mso_id,mso_name,contractor_id,contractor_name")
        .limit(5000);

    if (error) throw error;

    const msoMap = new Map<string, string>();
    const contractorMap = new Map<string, string>();

    for (const r of data ?? []) {
        const row = r as any;
        if (row.mso_id) msoMap.set(String(row.mso_id), String(row.mso_name ?? row.mso_id));
        if (row.contractor_id)
            contractorMap.set(String(row.contractor_id), String(row.contractor_name ?? row.contractor_id));
    }

    const msos: RosterOption[] = Array.from(msoMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const contractors: RosterOption[] = Array.from(contractorMap.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return { msos, contractors };
}
