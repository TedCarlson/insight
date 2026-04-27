// path: apps/web/src/app/api/people/update/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

type RequestBody = {
    person_id: string;
    full_name: string;
    legal_name?: string | null;
    preferred_name?: string | null;
    status?: "active" | "inactive" | "archived";
    tech_id?: string | null;
    fuse_emp_id?: string | null;
    nt_login?: string | null;
    csg?: string | null;
    mobile?: string | null;
    email?: string | null;
};

function clean(value: unknown): string | null {
    const next = String(value ?? "").trim();
    return next ? next : null;
}

async function upsertIdentifier(args: {
    sb: Awaited<ReturnType<typeof supabaseAdmin>>;
    person_id: string;
    identifier_type: "TECH_ID" | "FUSE_EMP_ID" | "NT_LOGIN" | "CSG_ID";
    identifier_value: string | null;
}) {
    if (!args.identifier_value) return;

    const { error } = await args.sb.schema("core").from("person_identifiers").upsert(
        {
            person_id: args.person_id,
            identifier_type: args.identifier_type,
            identifier_value: args.identifier_value,
            is_primary: true,
            updated_at: new Date().toISOString(),
        },
        {
            onConflict: "person_id,identifier_type",
        }
    );

    if (error) throw new Error(error.message);
}

async function upsertContact(args: {
    sb: Awaited<ReturnType<typeof supabaseAdmin>>;
    person_id: string;
    contact_type: "phone" | "email";
    contact_value: string | null;
}) {
    if (!args.contact_value) return;

    const { data: existing, error: existingError } = await args.sb
        .schema("core")
        .from("person_contacts")
        .select("person_contact_id")
        .eq("person_id", args.person_id)
        .eq("contact_type", args.contact_type)
        .eq("is_primary", true)
        .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing?.person_contact_id) {
        const { error } = await args.sb
            .schema("core")
            .from("person_contacts")
            .update({
                contact_value: args.contact_value,
                updated_at: new Date().toISOString(),
            })
            .eq("person_contact_id", existing.person_contact_id);

        if (error) throw new Error(error.message);
        return;
    }

    const { error } = await args.sb.schema("core").from("person_contacts").insert({
        person_id: args.person_id,
        contact_type: args.contact_type,
        contact_value: args.contact_value,
        is_primary: true,
    });

    if (error) throw new Error(error.message);
}

export async function POST(req: Request) {
    const userClient = await supabaseServer();
    const sb = await supabaseAdmin();

    const {
        data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: RequestBody;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const personId = clean(body.person_id);
    const fullName = clean(body.full_name);

    if (!personId || !fullName) {
        return NextResponse.json(
            { error: "Missing person_id or full_name" },
            { status: 400 }
        );
    }

    try {
        const { error: personError } = await sb
            .schema("core")
            .from("people")
            .update({
                full_name: fullName,
                legal_name: clean(body.legal_name),
                preferred_name: clean(body.preferred_name),
                status: body.status ?? "active",
                updated_at: new Date().toISOString(),
            })
            .eq("person_id", personId);

        if (personError) throw new Error(personError.message);

        await upsertIdentifier({
            sb,
            person_id: personId,
            identifier_type: "TECH_ID",
            identifier_value: clean(body.tech_id),
        });

        await upsertIdentifier({
            sb,
            person_id: personId,
            identifier_type: "FUSE_EMP_ID",
            identifier_value: clean(body.fuse_emp_id),
        });

        await upsertIdentifier({
            sb,
            person_id: personId,
            identifier_type: "NT_LOGIN",
            identifier_value: clean(body.nt_login),
        });

        await upsertIdentifier({
            sb,
            person_id: personId,
            identifier_type: "CSG_ID",
            identifier_value: clean(body.csg),
        });

        await upsertContact({
            sb,
            person_id: personId,
            contact_type: "phone",
            contact_value: clean(body.mobile),
        });

        await upsertContact({
            sb,
            person_id: personId,
            contact_type: "email",
            contact_value: clean(body.email),
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unable to update person" },
            { status: 500 }
        );
    }
}