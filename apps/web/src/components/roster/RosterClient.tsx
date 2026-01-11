// apps/web/src/components/roster/RosterClient.tsx
//
// Wire-up: 2 overlay entry paths
// 1) Add Person + assignments (existing)
// 2) Click table row -> Edit overlay w/ hydrate from selected row (new)
//
// Note: persistence handlers are still optional; this wires the surface + hydration.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RosterFilters, RosterOption, RosterRow } from "@/lib/roster/types";
import { RosterFiltersUI, RosterTable } from ".";
import { RosterOverlay } from "./RosterOverlay";

type Props = {
    initialRows?: RosterRow[];
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

type OverlayMode = "create" | "edit";
type CreationStage = "pre_person" | "post_person";

const OVERLAY_ENABLED = true;

export default function RosterClient(props: Props) {
    const router = useRouter();

    const rows = useMemo(() => (Array.isArray(props.initialRows) ? props.initialRows : []), [props.initialRows]);

    const [filters, setFilters] = useState<RosterFilters>(props.initialFilters);

    const didAutoExpand = useRef(false);

    useEffect(() => {
        if (didAutoExpand.current) return;

        const serverDeliveredAll = rows.length >= props.initialCount;
        if (serverDeliveredAll) {
            didAutoExpand.current = true;
            return;
        }

        didAutoExpand.current = true;

        const merged: RosterFilters = { ...filters, limit: String(props.initialCount), offset: "0" };
        setFilters(merged);
        router.push(`/roster?${toQuery(merged)}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function apply(next: RosterFilters) {
        const merged: RosterFilters = { ...filters, ...next };
        setFilters(merged);
        router.push(`/roster?${toQuery(merged)}`);
    }

    const [overlayOpen, setOverlayOpen] = useState(false);
    const [overlayMode, setOverlayMode] = useState<OverlayMode>("create");
    const [creationStage, setCreationStage] = useState<CreationStage>("pre_person");

    const [overlayPersonId, setOverlayPersonId] = useState<string | undefined>(undefined);
    const [selectedRow, setSelectedRow] = useState<RosterRow | null>(null);

    function closeOverlay() {
        setOverlayOpen(false);
        setCreationStage("pre_person");
        setOverlayMode("create");
        setOverlayPersonId(undefined);
        setSelectedRow(null);
    }

    function openCreateOverlay() {
        setSelectedRow(null);
        setOverlayPersonId(undefined);
        setOverlayMode("create");
        setCreationStage("pre_person");
        setOverlayOpen(true);
    }

    function openEditOverlay(row: RosterRow) {
        setSelectedRow(row);
        setOverlayPersonId(String(row.person_id));
        setOverlayMode("edit");
        setCreationStage("post_person");
        setOverlayOpen(true);
    }

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <RosterFiltersUI
                filters={filters}
                options={props.options}
                rows={rows}
                totalCount={props.initialCount}
                onChange={apply}
                onAddNew={OVERLAY_ENABLED ? openCreateOverlay : undefined}
            />

            <RosterTable rows={rows} onSelectRow={OVERLAY_ENABLED ? openEditOverlay : undefined} />

            {OVERLAY_ENABLED && (
                <RosterOverlay
                    open={overlayOpen}
                    mode={overlayMode}
                    creationStage={creationStage}
                    personId={overlayPersonId}
                    initialPerson={
                        selectedRow
                            ? {
                                  full_name: selectedRow.name ?? "",
                                  email: selectedRow.email ?? undefined,
                                  mobile: selectedRow.mobile ?? undefined,
                              }
                            : undefined
                    }
                    initialActivity={
                        selectedRow
                            ? {
                                  active_flag: selectedRow.active_flag ?? undefined,
                                  tech_id: selectedRow.tech_id ?? undefined,
                              }
                            : undefined
                    }
                    onHydrateBundle={
                        selectedRow
                            ? async () => ({
                                  person: {
                                      full_name: selectedRow.name ?? "",
                                      email: selectedRow.email ?? undefined,
                                      mobile: selectedRow.mobile ?? undefined,
                                  },
                                  activity: {
                                      active_flag: selectedRow.active_flag ?? undefined,
                                      tech_id: selectedRow.tech_id ?? undefined,
                                  },
                              })
                            : undefined
                    }
                    onClose={closeOverlay}
                />
            )}
        </div>
    );
}
