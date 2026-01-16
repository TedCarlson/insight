//apps/web/src/app/(prod)/assignment/AssignmentTable.tsx

'use client'

import type { AssignmentRow } from './assignment.types'

export default function AssignmentTable({
    rows,
    onAdd,
    onEdit,
}: {
    rows: AssignmentRow[]
    onAdd: () => void
    onEdit: (row: AssignmentRow) => void
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-[var(--to-ink)]">
                    Assignments
                </div>

                <button
                    onClick={onAdd}
                    className="rounded px-3 py-1.5 text-sm font-medium text-white bg-[var(--to-blue-600)]"
                >
                    + Add Assignment
                </button>
            </div>

            <div className="rounded border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-[var(--to-blue-050)] border-b">
                        <tr>
                            <th className="px-3 py-2 text-left">Assignment</th>
                            <th className="px-3 py-2 text-left">Person</th>
                            <th className="px-3 py-2 text-left">Company</th>
                            <th className="px-3 py-2 text-left">Role</th>
                            <th className="px-3 py-2 text-left">Reports To</th>
                            <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-8 text-center text-[var(--to-ink-muted)]"
                                >
                                    No assignments yet.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr
                                    key={row.assignment_id}
                                    className="border-t hover:bg-[var(--to-row-hover)] cursor-pointer"
                                    onClick={() => onEdit(row)}
                                >
                                    <td className="px-3 py-2 font-medium">
                                        {row.assignment_name}
                                    </td>
                                    <td className="px-3 py-2">{row.person_full_name}</td>
                                    <td className="px-3 py-2">{row.company_name ?? '—'}</td>
                                    <td className="px-3 py-2">{row.role ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        {row.reports_to_full_name ?? '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                        {row.active ? 'Active' : 'Inactive'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
