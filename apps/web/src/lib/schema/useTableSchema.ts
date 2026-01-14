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

/**
 * View → primary key column mapping
 * Views do NOT have PK constraints in Postgres,
 * so we must explicitly declare which column uniquely identifies rows.
 */
const VIEW_PK_OVERRIDES: Record<string, string[]> = {
    assignment_view: ['assignment_id'],
    pc_org_office_view: ['pc_org_office_id'],
    person_view: ['person_id'],
    quota_view: ['quota_id'],
    route_view: ['route_id'],
    schedule_view: ['schedule_id'],
    shift_validation_view: ['sv_id'],
};

export function useTableSchema(table: string | null) {
    const supabase = createClientComponentClient();

    const [schema, setSchema] = useState<ColumnMeta[] | null>(null);
    const [primaryKey, setPrimaryKey] = useState<string[]>([]);

    useEffect(() => {
        if (!table) {
            setSchema(null);
            setPrimaryKey([]);
            return;
        }

        let cancelled = false;

        async function fetchSchemaAndPK() {
            /**
             * 1) Fetch column metadata
             */
            const { data: columns, error: columnError } = await supabase.rpc(
                'get_table_columns',
                { p_table_name: table }
            );

            if (cancelled) return;

            if (columnError || !Array.isArray(columns)) {
                console.warn(`Schema unavailable for: ${table}`);
                setSchema(null);
                setPrimaryKey([]);
                return;
            }

            setSchema(columns);

            /**
             * 2) View PK override (explicit, intentional)
             */
            if (typeof table === 'string' && table in VIEW_PK_OVERRIDES) {
                setPrimaryKey(VIEW_PK_OVERRIDES[table]);
                return;
            }

            /**
             * 3) Base table PK lookup via RPC
             */
            try {
                const { data: pkCols, error: pkError } = await supabase.rpc(
                    'get_primary_keys',
                    { p_table_name: table }
                );

                if (cancelled) return;

                if (pkError || !Array.isArray(pkCols)) {
                    setPrimaryKey([]);
                    return;
                }

                setPrimaryKey(
                    pkCols
                        .map((r: any) => r?.column_name)
                        .filter((c: string | undefined): c is string => !!c)
                );
            } catch {
                setPrimaryKey([]);
            }
        }

        fetchSchemaAndPK();

        return () => {
            cancelled = true;
        };
    }, [table, supabase]);

    return {
        schema,
        primaryKey,
    };
}
