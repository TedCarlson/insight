// apps/web/src/components/roster/RosterClient.tsx
//
// Roster page client controller
// - Owns URL query sync + one-time auto-expand (fetch all rows if server sent only first page)
// - Owns "Add Person" overlay open/close state
// - Passes `rows` + `totalCount` into RosterFiltersUI for UI hints
// - Reset removed (auto-apply + clearing search makes Reset redundant)
// - Guards against undefined `initialRows` to prevent runtime "reading 'length'" errors

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RosterFilters, RosterOption, RosterRow } from "@/lib/roster/types";
import { RosterFiltersUI, RosterTable } from ".";
import { RosterOverlay } from "./RosterOverlay";

type Props = {
    initialRows?: RosterRow[]; // defensive: can be undefined due to RLS/view filters or fetch shape changes
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

type OverlayMode = "create" | "existing";
type CreationStage = "pre_person" | "post_person";

const OVERLAY_ENABLED = true;

export default function RosterClient({
    initialRows,
    initialCount,
    initialLimit,
    initialOffset,
    initialFilters,
    options,
}: Props) {
    const router = useRouter();

    // Defensive default: prevents runtime crashes and stabilizes effect deps
    const rows: RosterRow[] = Array.isArray(initialRows) ? initialRows : [];

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

        const serverDeliveredAll = rows.length >= initialCount;
        if (serverDeliveredAll) {
            didAutoExpand.current = true;
            return;
        }

        didAutoExpand.current = true;

        const next: RosterFilters = {
            ...filters,
            limit: String(initialCount),
            offset: "0",
        };

        setFilters(next);
        router.push(`/roster?${toQuery(next)}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows.length, initialCount]);

    useMemo(() => toQuery(filters), [filters]);

    function apply(next: Partial<RosterFilters>) {
        const merged: RosterFilters = { ...filters, ...next };
        if (!("offset" in next)) merged.offset = "0";
        setFilters(merged);
        router.push(`/roster?${toQuery(merged)}`);
    }

    // Overlay state (button-only entry)
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [overlayMode, setOverlayMode] = useState<OverlayMode>("create");
    const [creationStage, setCreationStage] = useState<CreationStage>("pre_person");

    function closeOverlay() {
        setOverlayOpen(false);
        setCreationStage("pre_person");
        setOverlayMode("create");
    }

    function openCreateOverlay() {
        setOverlayMode("create");
        setCreationStage("pre_person");
        setOverlayOpen(true);
    }

    return (
        <div className="space-y-3">
            <RosterFiltersUI
                filters={filters}
                options={options}
                rows={rows}
                totalCount={initialCount}
                onChange={apply}
                onAddNew={OVERLAY_ENABLED ? openCreateOverlay : undefined}
            />

            <RosterTable rows={rows} />

            {OVERLAY_ENABLED && (
                <RosterOverlay open={overlayOpen} mode={overlayMode} creationStage={creationStage} onClose={closeOverlay} />
            )}
        </div>
    );
}
