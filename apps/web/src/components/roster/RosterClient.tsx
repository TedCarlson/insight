// apps/web/src/components/roster/RosterClient.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RosterFilters, RosterOption, RosterRow } from "@/lib/roster/types";
import { RosterFiltersUI, RosterTable } from ".";

type Props = {
    initialRows: RosterRow[];
    initialCount: number;
    initialLimit: number;
    initialOffset: number;
    initialFilters: RosterFilters;
    options: { msos: RosterOption[]; contractors: RosterOption[] };
};

function toQuery(filters: RosterFilters) {
    const p = new URLSearchParams();

    if (filters.q) p.set("q", filters.q);
    if (filters.active) p.set("active", filters.active);
    if (filters.hasTech) p.set("hasTech", filters.hasTech);
    if (filters.mso) p.set("mso", filters.mso);
    if (filters.contractor) p.set("contractor", filters.contractor);

    p.set("limit", filters.limit ?? "50");
    p.set("offset", filters.offset ?? "0");

    return p.toString();
}

export default function RosterClient({
    initialRows,
    initialCount,
    initialLimit,
    initialOffset,
    initialFilters,
    options,
}: Props) {
    const router = useRouter();

    // Default to "show all" for current scope
    const [filters, setFilters] = useState<RosterFilters>({
        ...initialFilters,
        limit: String(initialCount),
        offset: "0",
    });

    const didAutoExpand = useRef(false);

    // If server delivered only first page, auto-refresh once to fetch all rows.
    useEffect(() => {
        if (didAutoExpand.current) return;

        const serverDeliveredAll = initialRows.length >= initialCount;
        if (serverDeliveredAll) {
            didAutoExpand.current = true;
            return;
        }

        // If server delivered limited set (e.g., 50 of 139), upgrade query once.
        didAutoExpand.current = true;

        const next: RosterFilters = {
            ...filters,
            limit: String(initialCount),
            offset: "0",
        };

        setFilters(next);
        router.push(`/roster?${toQuery(next)}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialRows.length, initialCount]);

    useMemo(() => toQuery(filters), [filters]);

    function apply(next: Partial<RosterFilters>) {
        const merged: RosterFilters = { ...filters, ...next };
        if (!("offset" in next)) merged.offset = "0";
        setFilters(merged);
        router.push(`/roster?${toQuery(merged)}`);
    }

    return (
        <div className="space-y-3">
            <RosterFiltersUI
                filters={filters}
                options={options}
                rows={initialRows}
                totalCount={initialCount}
                onChange={apply}
                onReset={() =>
                    apply({
                        q: "",
                        active: "1",
                        hasTech: "0",
                        mso: "",
                        contractor: "",
                        limit: String(initialCount),
                        offset: "0",
                    })
                }
            />

            <RosterTable rows={initialRows} />
        </div>
    );
}
