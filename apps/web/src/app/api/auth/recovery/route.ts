// apps/web/src/app/api/auth/recovery/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  email: string;
  next?: string; // optional post-password target, default "/home"
};

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }
    if (!service) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const next = (body.next ?? "/home").trim() || "/home";

    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(
      `/auth/set-password?next=${encodeURIComponent(next)}`
    )}`;

    const admin = createClient(url, service, { auth: { persistSession: false } });

    const linkRes = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkRes.error) {
      return NextResponse.json({ error: "generateLink(recovery) failed", details: linkRes.error }, { status: 400 });
    }

    const actionLink = (linkRes.data as any)?.properties?.action_link ?? null;

    if (!actionLink) {
      return NextResponse.json(
        { error: "Recovery link generated but action_link missing", data: linkRes.data },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      action_link: actionLink,
      redirect_to: redirectTo,
    });
  } catch (e: any) {
    console.error("RECOVERY_ROUTE_UNCAUGHT_ERROR", e);
    return NextResponse.json(
      { error: "Unhandled server error in /api/auth/recovery", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
