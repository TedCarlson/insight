//apps/web/src/app/api/admin/invite/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type InviteBody = {
  email: string;
  assignment_id: string;
};

export async function GET() {
  // Simple ping to prove the route exists (browser GET should show this JSON, not a 404 page)
  return NextResponse.json({ ok: true, route: "/api/admin/invite" });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
    const redirectTo = `${siteUrl}/auth/callback?next=/auth/set-password`;


    if (!url || !anon) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
        { status: 500 }
      );
    }
    if (!service) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* noop */
        },
      },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user || userErr) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let isOwner = false;
    try {
      const { data } = await supabase.rpc("is_owner");
      isOwner = !!data;
    } catch {
      isOwner = false;
    }
    if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let body: InviteBody;
    try {
      body = (await req.json()) as InviteBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const assignment_id = (body.assignment_id ?? "").trim();

    if (!email || !assignment_id) {
      return NextResponse.json({ error: "email and assignment_id are required" }, { status: 400 });
    }

    const prereq = await supabase
      .from("assignment_admin_v")
      .select("assignment_id, person_id, position_title, pc_org_id, pc_org_name")
      .eq("assignment_id", assignment_id)
      .maybeSingle();

    if (prereq.error) {
      return NextResponse.json(
        { error: "assignment_admin_v lookup failed", details: prereq.error },
        { status: 400 }
      );
    }
    if (!prereq.data) {
      return NextResponse.json({ error: "No assignment found for assignment_id" }, { status: 400 });
    }

    const person_id = (prereq.data as any)?.person_id ?? null;
    const position_title = (prereq.data as any)?.position_title ?? null;
    const pc_org_id = (prereq.data as any)?.pc_org_id ?? null;
    const pc_org_name = (prereq.data as any)?.pc_org_name ?? null;

    const missing: string[] = [];
    if (!person_id) missing.push("person");
    if (!position_title) missing.push("assignment.position_title");
    if (!pc_org_id) missing.push("pc_org");

    if (missing.length) {
      return NextResponse.json(
        {
          error: "Invite blocked: prerequisites missing",
          missing,
          found: { person_id, position_title, pc_org_id, pc_org_name },
        },
        { status: 400 }
      );
    }

    const admin = createClient(url, service, { auth: { persistSession: false } });

    const linkRes = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    if (linkRes.error) {
      return NextResponse.json(
        { error: "generateLink failed", details: linkRes.error, redirect_to: redirectTo },
        { status: 400 }
      );
    }

    const invitedUserId = (linkRes.data as any)?.user?.id ?? null;
    const actionLink = (linkRes.data as any)?.properties?.action_link ?? null;

    if (!invitedUserId) {
      return NextResponse.json(
        { error: "generateLink succeeded but no user id returned", data: linkRes.data },
        { status: 400 }
      );
    }

    const meta = { assignment_id, person_id, position_title, pc_org_id, pc_org_name };

    const upd = await admin.auth.admin.updateUserById(invitedUserId, {
      user_metadata: meta,
      app_metadata: { assignment_id },
    });

    if (upd.error) {
      return NextResponse.json(
        {
          ok: true,
          warning: "Invite link created, but metadata update failed",
          warning_details: upd.error,
          invited: { email, auth_user_id: invitedUserId, ...meta },
          action_link: actionLink,
          redirect_to: redirectTo,
        },
        { status: 200 }
      );
    }

    await admin
      .from("user_profile" as any)
      .upsert({ auth_user_id: invitedUserId, status: "active" }, { onConflict: "auth_user_id" as any });

    return NextResponse.json({
      ok: true,
      invited: { email, auth_user_id: invitedUserId, ...meta },
      action_link: actionLink,
      redirect_to: redirectTo,
    });
  } catch (e: any) {
    console.error("INVITE_ROUTE_UNCAUGHT_ERROR", e);
    return NextResponse.json(
      { error: "Unhandled server error", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
