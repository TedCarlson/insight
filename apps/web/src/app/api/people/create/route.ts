// path: apps/web/src/app/api/people/create/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

type RequestBody = {
  full_name: string;
  tech_id?: string | null;
  email?: string | null;
  mobile?: string | null;
  nt_login?: string | null;
  csg?: string | null;
  prospecting_affiliation_id?: string | null;
};

function clean(value: string | null | undefined) {
  const next = String(value ?? "").trim();
  return next || null;
}

export async function POST(req: Request) {
  const userClient = await supabaseServer();
  const adminClient = await supabaseAdmin();

  const {
    data: { user },
  } = await userClient.auth.getUser();

  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = clean(body.full_name);

  if (!fullName) {
    return NextResponse.json({ error: "Missing full_name" }, { status: 400 });
  }

  const { data: appUser } = await adminClient
    .from("app_users")
    .select("app_user_id")
    .eq("auth_user_id", user?.id)
    .eq("status", "active")
    .maybeSingle();

  const createdBy = appUser?.app_user_id ?? null;

  const { data, error } = await adminClient.rpc("people_create", {
    p_full_name: fullName,
    p_created_by_app_user_id: createdBy,
    p_tech_id: clean(body.tech_id),
    p_nt_login: clean(body.nt_login),
    p_csg: clean(body.csg),
    p_mobile: clean(body.mobile),
    p_email: clean(body.email),
    p_prospecting_affiliation_id: clean(body.prospecting_affiliation_id),
  });

  const person = data as { ok?: boolean; person_id?: string } | null;

  if (error || !person?.ok || !person.person_id) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to create person" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    person_id: person.person_id,
  });
}