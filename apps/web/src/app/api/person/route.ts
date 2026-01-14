import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

function createSupabase() {
  return createRouteHandlerClient({ cookies: () => cookies() });
}

export async function GET(req: NextRequest) {
  const supabase = createSupabase();
  const personId = req.nextUrl.searchParams.get('id');

  if (personId) {
    const { data, error } = await supabase
      .from('person')
      .select('*')
      .eq('person_id', personId)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/person?id] supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('person')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[GET /api/person] supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createSupabase();
  const body = await req.json();

  const { data, error } = await supabase
    .from('person')
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error('[POST /api/person] supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = createSupabase();
  const body = await req.json();
  const { person_id, ...fields } = body;

  if (!person_id) {
    return NextResponse.json({ error: 'Missing person_id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('person')
    .update(fields)
    .eq('person_id', person_id)
    .select()
    .single();

  if (error) {
    console.error('[PATCH /api/person] supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
