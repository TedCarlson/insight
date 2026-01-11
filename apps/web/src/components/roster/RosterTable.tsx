// apps/web/src/components/roster/RosterTable.tsx
//
// Roster table renderer
// - Wire-up: row click opens overlay edit (via onSelectRow)
// - Removes broken navigation to /roster/:person_id (route doesn't exist in zip)
// - Keeps current visual table

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

function pillState(activeFlag: boolean | null | undefined): "active" | "inactive" | "unknown" {
    if (activeFlag === true) return "active";
    if (activeFlag === false) return "inactive";
    return "unknown";
}

function companyOrContractor(r: RosterRow) {
    return fmt(r.company_name) || fmt(r.contractor_name) || "";
}

export default function RosterTable({ rows, onSelectRow }: Props) {
    const data = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

    function onRowClick(r: RosterRow) {
        if (!r?.person_id) return;
        onSelectRow?.(r);
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
                            <th className={styles.hideMd}>Email</th>
                            <th className={styles.hideMd}>Mobile</th>
                            <th className={styles.hideLg}>MSO</th>
                            <th className={styles.colCompany}>Company</th>
                            <th className={styles.hideLg}>Updated</th>
                        </tr>
                    </thead>

                    <tbody>
                        {data.map((r) => {
                            const state = pillState(r.active_flag);
                            return (
                                <tr
                                    key={String(r.person_id)}
                                    className={styles.row}
                                    onClick={() => onRowClick(r)}
                                    role={onSelectRow ? "button" : undefined}
                                    tabIndex={onSelectRow ? 0 : undefined}
                                >
                                    <td className={styles.colPill}>
                                        <span className={[styles.pill, styles[`pill_${state}`]].join(" ")}>{state}</span>
                                    </td>
                                    <td className={styles.colTech}>{fmt(r.tech_id)}</td>
                                    <td className={styles.colName}>{fmt(r.name)}</td>
                                    <td className={styles.hideMd}>{fmt(r.email)}</td>
                                    <td className={styles.hideMd}>{fmt(r.mobile)}</td>
                                    <td className={styles.hideLg}>{fmt(r.mso_name)}</td>
                                    <td className={styles.colCompany}>{companyOrContractor(r)}</td>
                                    <td className={styles.hideLg}>{fmt(r.last_updated)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
