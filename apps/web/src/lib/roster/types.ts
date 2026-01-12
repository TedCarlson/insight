//apps/web/src/lib/roster/types.ts

export type RosterRow = {
    person_id: string;

    name: string | null;
    email: string | null;
    mobile: string | null;
    active_flag: boolean | null;
    last_updated: string | null;

    tech_id: string | null;
    schedule_name: string | null;

    presence_name: string | null;
    pc_name: string | null;

    mso_id: string | null;
    mso_name: string | null;

    company_id: string | null;
    company_name: string | null;

    contractor_id: string | null;
    contractor_name: string | null;

    division_id: string | null;
    division_name: string | null;

    region_id: string | null;
    region_name: string | null;

    office_id: string | null;
    office_name: string | null;
};

export type RosterFilters = {
    q?: string;
    active?: "1" | "0";
    hasTech?: "1" | "0";
    mso?: string;
    contractor?: string;
    limit?: string;
    offset?: string;
};

export type RosterOption = {
    id: string;
    label: string;
};
