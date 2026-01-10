// apps/web/src/components/roster/RosterTable.tsx

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { RosterRow } from "@/lib/roster/types";
import styles from "./RosterTable.module.css";

function fmt(v: string | null | undefined) {
    return v && String(v).trim().length > 0 ? String(v) : "—";
}

function entityLabel(r: RosterRow) {
    if (r.contractor_name && r.contractor_name.trim()) return r.contractor_name;
    if (r.company_name && r.company_name.trim()) return r.company_name;
    return "—";
}

function StatusPill({ active }: { active: boolean }) {
    return (
        <span className={`${styles.pill} ${active ? styles.pillActive : styles.pillInactive}`}>
            <span className={`${styles.dot} ${active ? styles.dotActive : styles.dotInactive}`} />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

export default function RosterTable({ rows }: { rows: RosterRow[] }) {
    const router = useRouter();
    const data = useMemo(() => rows ?? [], [rows]);

    return (
        <section className={styles.card}>
            <header className={styles.cardHeader}>
                <div>
                    <div className={styles.title}>Roster</div>
                    <div className={styles.subtitle}>Click a row to view/edit</div>
                </div>
                <div className={styles.count}>{data.length.toLocaleString()} shown</div>
            </header>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={`${styles.theadTh} ${styles.colStatus}`}>Status</th>
                            <th className={`${styles.theadTh} ${styles.colTech}`}>Tech ID</th>
                            <th className={styles.theadTh}>Full Name</th>
                            <th className={`${styles.theadTh} ${styles.hideMd}`}>Email</th>
                            <th className={`${styles.theadTh} ${styles.hideMd}`}>Mobile</th>
                            <th className={styles.theadTh}>Entity</th>
                            <th className={`${styles.theadTh} ${styles.hideLg}`}>Region</th>
                            <th className={`${styles.theadTh} ${styles.hideLg}`}>Office</th>
                        </tr>
                    </thead>

                    <tbody>
                        {data.map((r, idx) => (
                            <tr
                                key={r.person_id}
                                className={`${styles.row} ${idx % 2 === 0 ? styles.rowOdd : styles.rowEven}`}
                                onClick={() => router.push(`/roster/${r.person_id}`)}
                                title="Open details"
                            >
                                <td className={styles.cell}>
                                    <StatusPill active={!!r.active_flag} />
                                </td>

                                <td className={styles.cell}>
                                    <span className={styles.monoChip}>{fmt(r.tech_id)}</span>
                                </td>

                                <td className={styles.cell}>
                                    <div className={styles.name}>{fmt(r.name)}</div>
                                    <div className={`${styles.sub} ${styles.hideUpMd}`}>{fmt(r.email)}</div>
                                </td>

                                <td className={`${styles.cell} ${styles.sub} ${styles.hideMd}`}>{fmt(r.email)}</td>
                                <td className={`${styles.cell} ${styles.sub} ${styles.hideMd}`}>{fmt(r.mobile)}</td>

                                <td className={styles.cell}>
                                    <div className={styles.entity}>{entityLabel(r)}</div>
                                    <div className={styles.sub}>
                                        {fmt(r.region_name)}
                                        {r.office_name ? ` • ${r.office_name}` : ""}
                                    </div>
                                </td>

                                <td className={`${styles.cell} ${styles.sub} ${styles.hideLg}`}>{fmt(r.region_name)}</td>
                                <td className={`${styles.cell} ${styles.sub} ${styles.hideLg}`}>{fmt(r.office_name)}</td>
                            </tr>
                        ))}

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
