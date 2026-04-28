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
};

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

  const { full_name, tech_id, email, mobile, nt_login, csg } = body;

  if (!full_name || !full_name.trim()) {
    return NextResponse.json(
      { error: "Missing full_name" },
      { status: 400 }
    );
  }

  // Resolve app_user_id
  const { data: appUser } = await adminClient
    .from("app_users")
    .select("app_user_id")
    .eq("auth_user_id", user?.id)
    .eq("status", "active")
    .maybeSingle();

  const createdBy = appUser?.app_user_id ?? null;

  // 1. Create person
  const { data: person, error: personError } = await adminClient
    .from("people")
    .insert({
      full_name: full_name.trim(),
      status: "onboarding",
      created_by_app_user_id: createdBy,
      updated_by_app_user_id: createdBy,
    })
    .select("person_id")
    .single();

  if (personError || !person) {
    return NextResponse.json(
      { error: personError?.message ?? "Unable to create person" },
      { status: 500 }
    );
  }

  const person_id = person.person_id;

  // 2. Insert contacts (optional)
  const contactRows: any[] = [];

  if (mobile) {
    contactRows.push({
      person_id,
      contact_type: "phone",
      contact_value: mobile,
    });
  }

  if (email) {
    contactRows.push({
      person_id,
      contact_type: "email",
      contact_value: email,
    });
  }

  if (nt_login) {
    contactRows.push({
      person_id,
      contact_type: "other",
      contact_value: `NT_LOGIN:${nt_login}`,
    });
  }

  if (csg) {
    contactRows.push({
      person_id,
      contact_type: "other",
      contact_value: `CSG:${csg}`,
    });
  }

  if (contactRows.length > 0) {
    await adminClient.from("person_contacts").insert(contactRows);
  }

  // 3. Insert identifier (tech_id)
  if (tech_id && tech_id.trim()) {
    await adminClient.from("person_identifiers").insert({
      person_id,
      identifier_type: "TECH_ID",
      identifier_value: tech_id.trim(),
    });
  }

  return NextResponse.json({
    ok: true,
    person_id,
  });
}