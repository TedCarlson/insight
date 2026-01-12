// apps/web/src/components/roster/RosterClient.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RosterFilters, RosterOption, RosterRow } from "@/lib/roster/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RosterOverlay } from "@/components/roster/RosterOverlay";
import RosterTable from "@/components/roster/RosterTable";
import RosterFiltersUI from "@/components/roster/RosterFilters";

type OrgOption = {
    org_type: "company" | "contractor" | string;
    org_id: string;
    org_name: string | null;
    org_code: string | null;
    active_flag: boolean | null;
};

type Props = {
    initialRows: RosterRow[];
    initialCount: number;
    initialLimit: number;
    initialOffset: number;
    options: { msos: RosterOption[]; contractors: RosterOption[] };
    initialFilters: RosterFilters;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}

export default function RosterClient(props: Props) {
    const router = useRouter();
    const supabase = useMemo(() => supabaseBrowser(), []);
    const firstRunRef = useRef(true);

    const [filters, setFilters] = useState<RosterFilters>(props.initialFilters);

    const [overlayOpen, setOverlayOpen] = useState(false);
    const [overlayMode, setOverlayMode] = useState<"create" | "edit">("create");
    const [creationStage, setCreationStage] = useState<"pre_person" | "post_person">("pre_person");
    const [overlayPersonId, setOverlayPersonId] = useState<string | undefined>(undefined);
    const [selectedRow, setSelectedRow] = useState<RosterRow | null>(null);

    // Prevent repeated replace() calls when params didn't materially change.
    const lastAppliedQueryRef = useRef<string>("");

    const listOrgOptions = useMemo(() => {
        return async (): Promise<OrgOption[]> => {
            const { data, error } = await supabase
                .from("v_org_options")
                .select("org_type,org_id,org_name,org_code,active_flag")
                .order("org_name", { ascending: true, nullsFirst: false })
                .limit(500);

            if (error) throw error;
            return (data ?? []) as OrgOption[];
        };
    }, [supabase]);

    const createPerson = useMemo(() => {
        return async (args: {
            person: {
                full_name: string;
                email?: string;
                mobile?: string;
                notes?: string;
                company_id?: string;
                contractor_id?: string;
            };
        }): Promise<{ personId: string }> => {
            const p = args.person;

            const company_id = p.company_id ?? null;
            const contractor_id = p.contractor_id ?? null;

            if (company_id && contractor_id) {
                throw new Error("Invalid org selection: both company_id and contractor_id are set.");
            }

            const payload = {
                full_name: p.full_name,
                email: p.email ?? null,
                mobile: p.mobile ?? null,
                notes: p.notes ?? null,
                company_id,
                contractor_id,
            };

            const { data, error } = await supabase.rpc("rpc_person_create", { p: payload });
            if (error) throw error;

            return { personId: String(data) };
        };
    }, [supabase]);

    const updatePerson = useMemo(() => {
        return async (args: {
            personId: string;
            person: {
                full_name: string;
                email?: string;
                mobile?: string;
                notes?: string;
                company_id?: string;
                contractor_id?: string;
            };
        }): Promise<void> => {
            const p = args.person;

            const company_id = p.company_id ?? null;
            const contractor_id = p.contractor_id ?? null;

            if (company_id && contractor_id) {
                throw new Error("Invalid org selection: both company_id and contractor_id are set.");
            }

            const payload = {
                full_name: p.full_name,
                email: p.email ?? null,
                mobile: p.mobile ?? null,
                notes: p.notes ?? null,
                company_id,
                contractor_id,
            };

            const { error } = await supabase.rpc("rpc_person_update", { person_id: args.personId, p: payload });
            if (error) throw error;
        };
    }, [supabase]);

    const queryString = useMemo(() => {
        const p = new URLSearchParams();

        if (filters.q) p.set("q", filters.q);
        if (filters.active) p.set("active", filters.active);
        if (filters.hasTech) p.set("hasTech", filters.hasTech);
        if (filters.mso) p.set("mso", filters.mso);
        if (filters.contractor) p.set("contractor", filters.contractor);

        p.set("limit", filters.limit ?? String(props.initialLimit));
        p.set("offset", filters.offset ?? String(props.initialOffset));

        return p.toString();
    }, [filters, props.initialLimit, props.initialOffset]);

    const debouncedQueryString = useDebouncedValue(queryString, 350);

    useEffect(() => {
        if (firstRunRef.current) {
            firstRunRef.current = false;
            // Prime lastApplied with whatever was initially rendered
            lastAppliedQueryRef.current = debouncedQueryString;
            return;
        }

        // Ignore-after-idle / stop constant updates:
        // If nothing actually changed, don't touch the router.
        if (debouncedQueryString === lastAppliedQueryRef.current) return;

        lastAppliedQueryRef.current = debouncedQueryString;
        router.replace(`/roster?${debouncedQueryString}`);
    }, [debouncedQueryString, router]);

    function applyFilters(next: Partial<RosterFilters>) {
        setFilters((prev) => {
            const merged: RosterFilters = { ...prev, ...next };

            // Default: any filter change resets paging unless caller explicitly supplies offset.
            if (!("offset" in next)) merged.offset = "0";

            return merged;
        });
    }

    function closeOverlay() {
        setOverlayOpen(false);
        setSelectedRow(null);
        setOverlayPersonId(undefined);
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
        setOverlayPersonId(row.person_id);
        setOverlayMode("edit");
        setCreationStage("post_person");
        setOverlayOpen(true);
    }

    return (
        <div className="space-y-4">
            <RosterFiltersUI
                filters={filters}
                options={props.options}
                onChange={applyFilters}
                rows={props.initialRows}
                totalCount={props.initialCount}
                onAddNew={openCreateOverlay}
            />

            <RosterTable rows={props.initialRows} onSelectRow={openEditOverlay} />

            {overlayOpen ? (
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
                                company_id: selectedRow.company_id ?? undefined,
                                contractor_id: selectedRow.contractor_id ?? undefined,
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
                            ? async (_args: { personId: string }) => ({
                                person: {
                                    full_name: selectedRow.name ?? "",
                                    email: selectedRow.email ?? undefined,
                                    mobile: selectedRow.mobile ?? undefined,
                                    company_id: selectedRow.company_id ?? undefined,
                                    contractor_id: selectedRow.contractor_id ?? undefined,
                                },
                                location: undefined,
                                activity: {
                                    active_flag: selectedRow.active_flag ?? undefined,
                                    tech_id: selectedRow.tech_id ?? undefined,
                                },
                                schedule: undefined,
                            })
                            : undefined
                    }
                    onListOrgOptions={listOrgOptions as any}
                    onCreatePerson={createPerson as any}
                    onUpdatePerson={updatePerson as any}
                    onClose={closeOverlay}
                />
            ) : null}
        </div>
    );
}
