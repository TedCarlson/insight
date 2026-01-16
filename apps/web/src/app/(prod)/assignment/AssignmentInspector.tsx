//apps/web/src/app/(prod)/assignment/AssignmentInspector.tsx

'use client'

import { useEffect, useState } from 'react'
import type {
    AssignmentRow,
    AssignmentInspectorMode,
    CreateAssignmentInput,
} from './assignment.types'

export default function AssignmentInspector({
    open,
    mode,
    assignment,
    onSave,
    onClose,
}: {
    open: boolean
    mode: AssignmentInspectorMode
    assignment?: AssignmentRow | null
    onSave: (payload: CreateAssignmentInput) => Promise<void>
    onClose: () => void
}) {
    const isCreate = mode === 'create'

    const [draft, setDraft] = useState<CreateAssignmentInput>({
        assignment_name: '',
        person_id: '',
        role: null,
        active: true,
        start_date: null,
        end_date: null,
    })

    useEffect(() => {
        if (!open) return

        if (isCreate) {
            setDraft({
                assignment_name: '',
                person_id: '',
                role: null,
                active: true,
                start_date: null,
                end_date: null,
            })
        } else if (assignment) {
            setDraft({
                assignment_name: assignment.assignment_name,
                person_id: assignment.person_id,
                role: assignment.role,
                active: assignment.active,
                start_date: assignment.start_date,
                end_date: assignment.end_date,
            })
        }
    }, [open, isCreate, assignment])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/25" />

            <div className="relative w-[640px] max-w-[92vw] rounded border bg-white shadow">
                <div
                    className={`px-5 py-4 border-b ${isCreate
                            ? 'bg-[var(--to-blue-100)]'
                            : 'bg-[var(--to-green-100)]'
                        }`}
                >
                    <div className="text-sm font-semibold">
                        {isCreate ? 'Add Assignment' : 'Edit Assignment'}
                    </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold mb-1">
                            Assignment Name
                        </label>
                        <input
                            className="w-full rounded border px-2 py-1.5"
                            value={draft.assignment_name}
                            onChange={(e) =>
                                setDraft({ ...draft, assignment_name: e.target.value })
                            }
                        />
                    </div>

                    <div className="text-xs text-[var(--to-ink-muted)]">
                        Reporting relationships are managed separately and shown here as
                        read-only in v1.
                    </div>
                </div>

                <div className="border-t px-5 py-3 flex justify-end gap-2">
                    <button
                        className="rounded border px-3 py-1.5 text-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        className="rounded px-3 py-1.5 text-sm bg-[var(--to-blue-600)] text-white"
                        onClick={() => onSave(draft)}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}
