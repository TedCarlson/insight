import Link from "next/link";

export type RosterRow = {
    person_pc_org_id: string;
    person_id: string;
    pc_org_id: string;

    full_name: string | null;
    person_role: string | null;
    person_active: boolean | null;

    membership_status: string | null;
    membership_active: boolean | null;

    position_title: string | null;
    assignment_id: string | null;
};

export type RosterPageShellProps = {
    surface: "lead" | "admin";
    rosterRows: RosterRow[];
    rosterError: string | null;
    onOnboard: () => void;
    unassignedError?: string | null;
};


function Pill({ text }: { text: string }) {
    return (
        <span className="inline-flex items-center rounded-full border border-[var(--to-border)] bg-[var(--to-surface-soft)] px-2 py-0.5 text-xs">
            {text}
        </span>
    );
}

export function RosterPageShell({
    surface,
    rosterRows,
    rosterError,
    onOnboard,
    unassignedError,
}: RosterPageShellProps) {

    const surfaceLabel = surface === "admin" ? "Admin" : "Leadership";

    return (
        <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold">Roster</div>
                        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                            {surfaceLabel} roster workspace (v2). Canonical row: Person-in-PC_Org.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onOnboard}
                        className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
                    >
                        + Onboard
                    </button>

                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <Pill text={`Rows: ${rosterRows.length}`} />
                    <Pill text="Source: v_roster_active" />
                </div>

                {rosterError ? (
                    <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
                        <div className="font-semibold">Roster query failed</div>
                        <div className="mt-1 opacity-90">{rosterError}</div>
                    </div>
                ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)]">
                <div className="border-b border-[var(--to-border)] p-4">
                    <div className="text-sm font-semibold">People in unit</div>
                    <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                        Click behavior and segmented overlay comes next.
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--to-surface-soft)] text-left">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Name</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Membership</th>
                                <th className="px-4 py-3 font-semibold">Position</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rosterRows.map((r) => (
                                <tr key={r.person_pc_org_id} className="border-t border-[var(--to-border)]">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{r.full_name ?? "—"}</div>
                                        <div className="text-xs text-[var(--to-ink-muted)]">
                                            person_active: {String(r.person_active)} • membership_active:{" "}
                                            {String(r.membership_active)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{r.person_role ?? "—"}</td>
                                    <td className="px-4 py-3">{r.membership_status ?? "—"}</td>
                                    <td className="px-4 py-3">{r.position_title ?? "—"}</td>
                                </tr>
                            ))}

                            {rosterRows.length === 0 && !rosterError ? (
                                <tr>
                                    <td className="px-4 py-8 text-[var(--to-ink-muted)]" colSpan={4}>
                                        No roster rows found for the current context yet.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
                <div className="text-sm font-semibold">Legacy access</div>
                <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                    Legacy pages remain available while v2 consolidates workflows.
                </div>

                <div className="mt-3 text-sm">
                    <Link href="/org" className="underline">
                        Go to /org
                    </Link>
                </div>
            </div>
        </div>
    );
}
