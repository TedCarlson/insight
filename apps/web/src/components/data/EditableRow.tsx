// components/data/EditableRow.tsx
'use client';

import React from 'react';
import type { ColumnMeta } from '@/lib/schema/useTableSchema';

type Props = {
    row: any;
    schema: ColumnMeta[];
    editing: boolean;
    onChange: (key: string, value: any) => void;
};

export default function EditableRow({ row, schema, editing, onChange }: Props) {
    return (
        <>
            {schema.map((col) => {
                const { column_name, data_type, is_identity } = col;
                const value = row?.[column_name] ?? '';

                if (!editing) {
                    return (
                        <td key={column_name} className="px-3 py-2 border-b">
                            {String(value)}
                        </td>
                    );
                }

                // READ-ONLY FIELDS
                if (is_identity) {
                    return (
                        <td key={column_name} className="px-3 py-2 border-b text-gray-500 italic">
                            {String(value)}
                        </td>
                    );
                }

                // INPUT TYPE LOGIC
                let inputType = 'text';
                if (['int', 'numeric', 'bigint'].some(t => data_type.includes(t))) inputType = 'number';
                if (data_type === 'boolean') inputType = 'checkbox';
                if (data_type.includes('date') || data_type.includes('timestamp')) inputType = 'date';

                return (
                    <td key={column_name} className="px-3 py-2 border-b">
                        {inputType === 'checkbox' ? (
                            <input
                                type="checkbox"
                                checked={!!value}
                                onChange={(e) => onChange(column_name, e.target.checked)}
                            />
                        ) : (
                            <input
                                type={inputType}
                                value={value}
                                onChange={(e) => onChange(column_name, e.target.value)}
                                className="w-full border rounded px-1 text-xs"
                                placeholder={column_name}
                            />
                        )}
                    </td>
                );
            })}
        </>
    );
}
