// components/data/EditableRow.tsx

'use client';

import React from 'react';
import type { ColumnMeta } from '@/lib/schema/useTableSchema';

type Props = {
    row: any;
    schema?: ColumnMeta[] | null;
    editing: boolean;
    onChange: (key: string, value: any) => void;
    lockedFields?: string[];
};

export default function EditableRow({
    row,
    schema,
    editing,
    onChange,
    lockedFields = [],
}: Props) {
    // HARD GUARD — never assume schema is ready
    if (!Array.isArray(schema) || schema.length === 0) {
        return null;
    }

    return (
        <>
            {schema.map((col) => {
                const { column_name, data_type, is_identity } = col;
                const value = row?.[column_name] ?? '';

                const isLocked =
                    is_identity || lockedFields.includes(column_name);

                // View mode
                if (!editing) {
                    return (
                        <td key={column_name} className="px-3 py-2 border-b">
                            {String(value)}
                        </td>
                    );
                }

                // Locked / PK field
                if (isLocked) {
                    return (
                        <td
                            key={column_name}
                            className="px-3 py-2 border-b text-gray-500 italic"
                        >
                            {String(value)}
                        </td>
                    );
                }

                // Input type inference
                let inputType = 'text';
                if (
                    ['int', 'numeric', 'bigint'].some((t) =>
                        data_type.includes(t)
                    )
                ) {
                    inputType = 'number';
                } else if (data_type === 'boolean') {
                    inputType = 'checkbox';
                } else if (
                    data_type.includes('date') ||
                    data_type.includes('timestamp')
                ) {
                    inputType = 'date';
                }

                return (
                    <td key={column_name} className="px-3 py-2 border-b">
                        {inputType === 'checkbox' ? (
                            <input
                                type="checkbox"
                                checked={!!value}
                                onChange={(e) =>
                                    onChange(column_name, e.target.checked)
                                }
                            />
                        ) : (
                            <input
                                type={inputType}
                                value={value}
                                onChange={(e) =>
                                    onChange(column_name, e.target.value)
                                }
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
