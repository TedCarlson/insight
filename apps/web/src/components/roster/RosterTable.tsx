// apps/web/src/components/roster/RosterTable.tsx
//
// Modern roster table renderer (status pill + tech id leading columns)
// - Removes the confusing "—" secondary line under the name when no company/contractor exists
// - Renames "Contractor" column to "Company"
// - Company column renders contractor_name OR company_name (whichever exists)

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { RosterRow } from "@/lib/roster/types";
import styles from "./RosterTable.module.css";

type Props = {
    rows: RosterRow[];
};

function fmt(v: string | null | undefined) {
    return v && String(v).trim().length > 0 ? String(v) : "";
}

function dashIfEmpty(v: string | null | undefined) {
    const s = fmt(v);
    return s ? s : "—";
}

function pillState(activeFlag: boolean | null | undefined): "active" | "inactive" | "unknown" {
    if (activeFlag === true) return "active";
    if (activeFlag === false) return "inactive";
    return "unknown";
}

function companyOrContractor(r: RosterRow) {
    // Only one should exist, but accept either
    return fmt(r.company_name) || fmt(r.contractor_name) || "";
}

export default function RosterTable({ rows }: Props) {
    const router = useRouter();
    const data = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

    function onRowClick(r: RosterRow) {
        if (!r?.person_id) return;
        router.push(`/roster/${String(r.person_id)}`);
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
                            <th className={styles.hideLg}>Mobile</th>
                            <th className={styles.hideMd}>Company</th>
                            <th className={styles.hideLg}>Region</th>
                            <th className={styles.hideLg}>Office</th>
                        </tr>
                    </thead>

                    <tbody>
                        {data.map((r) => {
                            const state = pillState(r.active_flag);
                            const secondary = companyOrContractor(r); // used under name only if present

                            return (
                                <tr
                                    key={r.person_id}
                                    className={styles.row}
                                    onClick={() => onRowClick(r)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <td className={styles.colPill}>
                                        <span
                                            className={[
                                                styles.pill,
                                                state === "active" ? styles.pillActive : "",
                                                state === "inactive" ? styles.pillInactive : "",
                                                state === "unknown" ? styles.pillUnknown : "",
                                            ].join(" ")}
                                            title={state === "unknown" ? "Unknown" : state === "active" ? "Active" : "Inactive"}
                                        >
                                            {state === "unknown" ? "—" : state === "active" ? "Active" : "Inactive"}
                                        </span>
                                    </td>

                                    <td className={styles.colTech}>
                                        <span className={styles.mono}>{dashIfEmpty(r.tech_id)}</span>
                                    </td>

                                    <td className={styles.colName}>
                                        <div className={styles.primary}>{dashIfEmpty(r.name)}</div>

                                        {/* Only render the secondary line when there is real content */}
                                        {secondary ? <div className={styles.secondary}>{secondary}</div> : null}
                                    </td>

                                    <td className={styles.hideMd}>{dashIfEmpty(r.email)}</td>
                                    <td className={styles.hideLg}>{dashIfEmpty(r.mobile)}</td>

                                    {/* Company column: contractor_name OR company_name */}
                                    <td className={styles.hideMd}>{dashIfEmpty(companyOrContractor(r))}</td>

                                    <td className={styles.hideLg}>{dashIfEmpty(r.region_name)}</td>
                                    <td className={styles.hideLg}>{dashIfEmpty(r.office_name)}</td>
                                </tr>
                            );
                        })}

                        {data.length === 0 && (
                            <tr>
                                <td className={styles.empty} colSpan={8}>
                                    No roster rows match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
