// lib/schema/useTableSchema.ts
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type ColumnMeta = {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    is_identity: boolean;
    default_value: string | null;
};

export function useTableSchema(table: string | null) {
    const supabase = createClientComponentClient();
    const [schema, setSchema] = useState<ColumnMeta[] | null>(null);

    useEffect(() => {
        if (!table) return;

        async function fetchSchema() {
            const { data, error } = await supabase.rpc('get_table_columns', {
                p_table_name: table,
            });

            if (error) {
                console.error('Schema fetch error:', error.message);
                setSchema(null);
                return;
            }

            setSchema(data);
        }

        fetchSchema();
    }, [table]);

    return schema;
}
