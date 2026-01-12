// apps/web/src/components/roster/RosterTable.tsx
//
// Roster table renderer
// - Row click opens overlay edit (via onSelectRow)
// - Baseline view hides sensitive details (Email/Mobile -> Y/N)
// - Status pill gentler + green/red
// - Adds Region + PC columns after Company
// - Formats Updated timestamp to human-friendly

"use client";

import { useMemo } from "react";
import type { RosterRow } from "@/lib/roster/types";
import styles from "./RosterTable.module.css";

type Props = {
    rows: RosterRow[];
    onSelectRow?: (row: RosterRow) => void;
};

function fmt(v: any) {
    const s = v === null || v === undefined ? "" : String(v).trim();
    return s ? s : "—";
}

function yesNo(v: any) {
    const s = v === null || v === undefined ? "" : String(v).trim();
    return s ? "Y" : "—";
}

function pillState(
    activeFlag: boolean | null | undefined
): "active" | "inactive" | "unknown" {
    if (activeFlag === true) return "active";
    if (activeFlag === false) return "inactive";
    return "unknown";
}

function pillLabel(state: "active" | "inactive" | "unknown") {
    if (state === "active") return "Active";
    if (state === "inactive") return "Inactive";
    return "—";
}

function companyOrContractor(r: RosterRow) {
    // fmt() returns "—" for empty; preserve that behavior
    const c = fmt(r.company_name);
    if (c !== "—") return c;
    return fmt(r.contractor_name);
}

function fmtUpdated(v: any) {
    if (v === null || v === undefined) return "—";
    const raw = String(v).trim();
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw; // don't assume format
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(d);
}

export default function RosterTable({ rows, onSelectRow }: Props) {
    const data = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

    function onRowClick(r: RosterRow) {
        if (!r?.person_id) return;
        onSelectRow?.(r);
    }

    function onRowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>, r: RosterRow) {
        if (!onSelectRow) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onRowClick(r);
        }
    }

    return (
        <section className={styles.card}>
            <div className={styles.header}>
                <div>
                    <div className={styles.title}>Roster</div>
                    <div className={styles.subtitle}>People visible in current scope</div>
                </div>

                <div className={styles.count}>
                    {data.length} row{data.length === 1 ? "" : "s"}
                </div>
            </div>

            <div className={styles.wrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.colPill}>Status</th>
                            <th className={styles.colTech}>Tech ID</th>
                            <th className={styles.colName}>Name</th>

                            {/* Baseline privacy: show presence, not value */}
                            <th className={styles.hideMd}>Email</th>
                            <th className={styles.hideMd}>Mobile</th>

                            <th className={styles.hideLg}>MSO</th>

                            <th className={styles.colCompany}>Company</th>
                            <th className={styles.colRegion}>Region</th>
                            <th className={styles.colPc}>PC</th>

                            <th className={styles.hideLg}>Updated</th>
                        </tr>
                    </thead>

                    <tbody>
                        {data.map((r) => {
                            const state = pillState(r.active_flag);
                            const pill = [styles.pill, styles[`pill_${state}`]].join(" ");

                            return (
                                <tr
                                    key={String(r.person_id)}
                                    className={styles.row}
                                    onClick={() => onRowClick(r)}
                                    onKeyDown={(e) => onRowKeyDown(e, r)}
                                    role={onSelectRow ? "button" : undefined}
                                    tabIndex={onSelectRow ? 0 : undefined}
                                    aria-label={onSelectRow ? `Edit ${fmt(r.name)}` : undefined}
                                >
                                    <td className={styles.colPill}>
                                        <span className={pill}>{pillLabel(state)}</span>
                                    </td>

                                    <td className={styles.colTech}>{fmt(r.tech_id)}</td>
                                    <td className={styles.colName}>{fmt(r.name)}</td>

                                    <td className={styles.hideMd}>{yesNo(r.email)}</td>
                                    <td className={styles.hideMd}>{yesNo(r.mobile)}</td>

                                    <td className={styles.hideLg}>{fmt(r.mso_name)}</td>

                                    <td className={styles.colCompany}>{companyOrContractor(r)}</td>
                                    <td className={styles.colRegion}>{fmt(r.region_name)}</td>
                                    <td className={styles.colPc}>{fmt(r.pc_name)}</td>

                                    <td className={styles.hideLg}>{fmtUpdated(r.last_updated)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {data.length === 0 && <div className={styles.empty}>No roster rows in current scope.</div>}
            </div>
        </section>
    );
}
