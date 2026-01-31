// apps/web/src/app/api/admin/invite/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { normalizeNext } from "@/lib/navigation/next";

type InviteBody = {
  email: string;
  assignment_id: string;
  next?: string; // optional post-password target, default "/home"
};

/**
 * Owner-only invite endpoint.
 *
 * Sends an invite email (Supabase admin.inviteUserByEmail) and stamps the invited user's metadata
 * so the app can bootstrap user_profile on first login.
 *
 * Requires env:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_SITE_URL (optional; falls back to request origin)
 */
export async function GET() {
  // Avoid “success” responses for an admin endpoint via browser GET.
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Prefer explicit site URL; otherwise use request origin (works in previews)
    const origin = new URL(req.url).origin;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/+$/, "");

    if (!url || !anon) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
        { status: 500 }
      );
    }
    if (!service) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    // Session-aware client (cookie auth)
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

    // AuthZ: must be signed in and be owner
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

    // Parse body
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

    // IMPORTANT: next is where user should land AFTER they set password
    const postPasswordNext = normalizeNext(body.next ?? "/home");

    /**
     * IMPORTANT:
     * For Supabase invites, send users DIRECTLY to /auth/set-password.
     * That page can consume the token fragment (#access_token/#refresh_token)
     * and complete the password set + session bootstrap.
     *
     * Also: use URL() to be origin-safe even if NEXT_PUBLIC_SITE_URL includes a path.
     */
    const setPasswordUrl = new URL("/auth/set-password", siteUrl);
    setPasswordUrl.searchParams.set("next", postPasswordNext);
    const redirectTo = setPasswordUrl.toString();

    // Validate prerequisites via assignment_admin_v (already present in Phase 2 work)
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

    // Service-role client (admin)
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // Stamp metadata for bootstrap (client never sees service key)
    const meta = { assignment_id, person_id, position_title, pc_org_id, pc_org_name };

    // Send invite email (Supabase sends the email)
    const inviteRes = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: meta, // user_metadata
    });

    if (inviteRes.error) {
      return NextResponse.json(
        { error: "inviteUserByEmail failed", details: inviteRes.error, redirect_to: redirectTo },
        { status: 400 }
      );
    }

    const invitedUserId = (inviteRes.data as any)?.user?.id ?? null;

    if (!invitedUserId) {
      return NextResponse.json(
        { error: "inviteUserByEmail succeeded but no user id returned", data: inviteRes.data },
        { status: 400 }
      );
    }

    const upd = await admin.auth.admin.updateUserById(invitedUserId, {
      user_metadata: meta,
      app_metadata: { assignment_id },
    });

    if (upd.error) {
      return NextResponse.json(
        {
          ok: true,
          emailed: true,
          warning: "Invite email sent, but metadata update failed",
          warning_details: upd.error,
          invited: { email, auth_user_id: invitedUserId, ...meta },
          redirect_to: redirectTo,
        },
        { status: 200 }
      );
    }

    // Ensure user_profile exists and is linked (service-role bypasses RLS)
    const nowIso = new Date().toISOString();
    await admin.from("user_profile" as any).upsert(
      {
        auth_user_id: invitedUserId,
        status: "active",
        person_id,
        selected_pc_org_id: pc_org_id,
        created_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "auth_user_id" as any }
    );

    return NextResponse.json({
      ok: true,
      emailed: true,
      invited: { email, auth_user_id: invitedUserId, ...meta },
      redirect_to: redirectTo,
      post_password_next: postPasswordNext,
    });
  } catch (e: any) {
    console.error("INVITE_ROUTE_UNCAUGHT_ERROR", e);
    return NextResponse.json(
      { error: "Unhandled server error", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
