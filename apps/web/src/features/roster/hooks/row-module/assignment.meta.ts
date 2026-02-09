export type OfficeOption = { id: string; label: string; sublabel?: string };

export async function fetchOfficeOptions(pcOrgId: string): Promise<OfficeOption[]> {
    const sp = new URLSearchParams();
    sp.set("pc_org_id", String(pcOrgId));

    const res = await fetch(`/api/meta/offices?${sp.toString()}`, { method: "GET" });
    const json = await res.json().catch(() => ({} as any));

    if (!res.ok) {
        const msg = (json as any)?.error || (json as any)?.message || `Failed to load offices (${res.status})`;
        throw new Error(String(msg));
    }

    const list = Array.isArray((json as any)?.rows) ? (json as any).rows : Array.isArray(json) ? json : [];
    const rows: OfficeOption[] = list
        .filter((o: any) => o && (o.id || o.office_id))
        .map((o: any) => ({
            id: String(o.id ?? o.office_id),
            label: String(o.label ?? o.office_name ?? o.name ?? o.id ?? o.office_id),
            sublabel: o.sublabel != null ? String(o.sublabel) : undefined,
        }));

    rows.sort((a: OfficeOption, b: OfficeOption) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

    return rows;
}