// apps/web/src/app/(shell)/models/page.tsx

'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EditableRow from '@/components/data/EditableRow';
import { useTableSchema } from '@/lib/schema/useTableSchema';

const TABLES = [
    'person',
    'assignment',
    'schedule',
    'shift_validation',
    'company',
    'contractor',
    'division',
    'office',
    'route',
    'region',
];

export default function ModelsPage() {
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingRow, setEditingRow] = useState<any | null>(null);
    const [newRow, setNewRow] = useState<any>({});

    // ✅ CLIENT + SCHEMA HOOKS MUST LIVE HERE
    const supabase = createClientComponentClient();
    const schema = useTableSchema(selectedTable);

    async function loadTable(table: string) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(100);

        if (error) {
            console.error('Error loading table:', error.message);
            setData([]);
            return;
        }

        setSelectedTable(table);
        setData(Array.isArray(data) ? data : []);
        setEditingIndex(null);
        setEditingRow(null);
        setNewRow({});
    }

    async function updateRow() {
        if (editingIndex === null || !editingRow) return;

        const original = data[editingIndex];
        if (!original?.id) {
            console.warn('Row has no id — update skipped');
            return;
        }

        const { error } = await supabase
            .from(selectedTable!)
            .update(editingRow)
            .eq('id', original.id);

        if (error) {
            console.error('Update failed:', error.message);
            return;
        }

        await loadTable(selectedTable!);
    }

    async function deleteRow(index: number) {
        const row = data[index];
        if (!row?.id) {
            console.warn('Row has no id — delete skipped');
            return;
        }

        const { error } = await supabase
            .from(selectedTable!)
            .delete()
            .eq('id', row.id);

        if (error) {
            console.error('Delete failed:', error.message);
            return;
        }

        await loadTable(selectedTable!);
    }

    async function insertRow() {
        const { error } = await supabase
            .from(selectedTable!)
            .insert([newRow]);

        if (error) {
            console.error('Insert failed:', error.message);
            return;
        }

        await loadTable(selectedTable!);
    }

    return (
        <main className="p-6 space-y-6">
            <h1 className="text-xl font-semibold text-[var(--to-ink)]">Models</h1>

            <div className="flex gap-4 flex-wrap">
                {TABLES.map((table) => (
                    <button
                        key={table}
                        onClick={() => loadTable(table)}
                        className="px-3 py-1 text-sm border rounded-lg bg-[var(--to-blue-050)] hover:bg-[var(--to-blue-100)] text-[var(--to-ink)]"
                    >
                        {table}
                    </button>
                ))}
            </div>

            {selectedTable && schema && (
                <section className="mt-4 space-y-4">
                    <h2 className="font-medium text-lg text-[var(--to-ink-muted)]">
                        {selectedTable} preview
                    </h2>

                    <div className="overflow-auto border rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[var(--to-blue-050)]">
                                <tr>
                                    {schema.map((col) => (
                                        <th
                                            key={col.column_name}
                                            className="px-3 py-2 text-left border-b font-semibold"
                                        >
                                            {col.column_name}
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 border-b">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {data.map((row, index) => {
                                    const isEditing = editingIndex === index;

                                    return (
                                        <tr
                                            key={index}
                                            className="odd:bg-white even:bg-[var(--to-blue-050)]"
                                        >
                                            <EditableRow
                                                row={isEditing ? editingRow : row}
                                                schema={schema}
                                                editing={isEditing}
                                                onChange={(key, value) =>
                                                    setEditingRow({ ...editingRow, [key]: value })
                                                }
                                            />

                                            <td className="px-3 py-2 border-b whitespace-nowrap">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={updateRow}
                                                            className="text-blue-600 hover:underline text-xs mr-2"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingIndex(null);
                                                                setEditingRow(null);
                                                            }}
                                                            className="text-gray-500 hover:underline text-xs mr-2"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingIndex(index);
                                                            setEditingRow(row);
                                                        }}
                                                        className="text-blue-600 hover:underline text-xs mr-2"
                                                    >
                                                        Edit
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => deleteRow(index)}
                                                    className="text-red-600 hover:underline text-xs"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-sm font-semibold mb-2">Insert new row</h3>

                        <div className="flex flex-wrap gap-4">
                            {schema
                                .filter((col) => !col.is_identity)
                                .map((col) => (
                                    <input
                                        key={col.column_name}
                                        placeholder={col.column_name}
                                        className="border px-2 py-1 text-sm rounded w-48"
                                        value={newRow[col.column_name] ?? ''}
                                        onChange={(e) =>
                                            setNewRow({
                                                ...newRow,
                                                [col.column_name]: e.target.value,
                                            })
                                        }
                                    />
                                ))}
                        </div>

                        <button
                            onClick={insertRow}
                            className="mt-2 inline-block px-4 py-1 text-sm bg-[var(--to-blue-600)] text-white rounded hover:bg-[var(--to-blue-700)]"
                        >
                            Insert
                        </button>
                    </div>
                </section>
            )}
        </main>
    );
}
