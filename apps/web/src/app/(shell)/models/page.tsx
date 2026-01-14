// apps/web/src/app/(shell)/models/page.tsx

'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import EditableRow from '@/components/data/EditableRow';
import { useTableSchema, ColumnMeta } from '@/lib/schema/useTableSchema';

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

    const supabase = createClientComponentClient();
    const { schema, primaryKey } = useTableSchema(selectedTable);

    async function fetchData(table: string) {
        const { data, error } = await supabase.from(table).select('*').limit(50);
        if (error) {
            console.error(error.message);
            return;
        }
        setData(data ?? []);
    }

    async function handleSave(row: any) {
        const key = primaryKey?.[0];
        if (!key || !(key in row)) return;

        const { error } = await supabase
            .from(selectedTable!)
            .update(row)
            .eq(key, row[key]);

        if (!error) {
            await fetchData(selectedTable!);
            setEditingIndex(null);
            setEditingRow(null);
        }
    }

    async function handleDelete(row: any) {
        const key = primaryKey?.[0];
        if (!key || !(key in row)) return;

        const { error } = await supabase
            .from(selectedTable!)
            .delete()
            .eq(key, row[key]);

        if (!error) {
            await fetchData(selectedTable!);
        }
    }

    async function handleInsert() {
        const { error } = await supabase.from(selectedTable!).insert(newRow);
        if (!error) {
            setNewRow({});
            await fetchData(selectedTable!);
        }
    }

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-semibold">Models</h1>

            <select
                value={selectedTable ?? ''}
                onChange={(e) => {
                    const t = e.target.value;
                    setSelectedTable(t);
                    fetchData(t);
                }}
                className="border px-2 py-1 rounded"
            >
                <option value="" disabled>
                    Select table
                </option>
                {TABLES.map((t) => (
                    <option key={t} value={t}>
                        {t}
                    </option>
                ))}
            </select>

            {selectedTable && Array.isArray(schema) && (
                <table className="min-w-full text-sm border">
                    <thead className="bg-gray-100">
                        <tr>
                            {schema.map((col: ColumnMeta) => (
                                <th
                                    key={col.column_name}
                                    className="px-3 py-2 border-b text-left"
                                >
                                    {col.column_name}
                                </th>
                            ))}
                            <th className="px-3 py-2 border-b">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* Insert Row */}
                        <tr>
                            <EditableRow
                                row={newRow}
                                schema={schema}
                                editing={true}
                                onChange={(key, value) =>
                                    setNewRow((prev: any) => ({
                                        ...prev,
                                        [key]: value,
                                    }))
                                }
                            />
                            <td className="px-2 border-b">
                                <button
                                    className="text-xs text-green-600"
                                    onClick={handleInsert}
                                >
                                    Insert
                                </button>
                            </td>
                        </tr>

                        {/* Data Rows */}
                        {data.map((row, idx) => {
                            const isEditing = editingIndex === idx;
                            return (
                                <tr key={idx}>
                                    <EditableRow
                                        row={isEditing ? editingRow : row}
                                        schema={schema}
                                        editing={isEditing}
                                        onChange={(key, value) =>
                                            setEditingRow((prev: any) => ({
                                                ...prev,
                                                [key]: value,
                                            }))
                                        }
                                    />
                                    <td className="px-2 border-b space-x-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    className="text-xs text-blue-600"
                                                    onClick={() => handleSave(editingRow)}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    className="text-xs text-gray-500"
                                                    onClick={() => {
                                                        setEditingIndex(null);
                                                        setEditingRow(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    className="text-xs text-blue-600"
                                                    onClick={() => {
                                                        setEditingIndex(idx);
                                                        setEditingRow(row);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="text-xs text-red-600"
                                                    onClick={() => handleDelete(row)}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
