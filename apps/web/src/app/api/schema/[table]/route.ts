// apps/web/src/app/api/schema/[table]/route.ts

import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';

export async function GET(
    _request: Request,
    { params }: { params: { table: string } }
) {
    const supabase = supabaseServer(); // ✅ REQUIRED

    const { data, error } = await supabase.rpc(
        'get_table_columns',
        { p_table_name: params.table }
    );

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
