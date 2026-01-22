// apps/web/src/app/api/auth/recovery/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeNext } from "@/lib/navigation/next";

type Body = {
  email: string;
  next?: string; // optional post-password target, default "/"
};


function isLikelyEmail(email: string): boolean {
  // Simple, pragmatic check (not RFC-perfect, but good enough for UX gating)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
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
    const next = normalizeNext(body.next ?? null);

    if (!isLikelyEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Prefer explicit site URL, otherwise use request origin (works in previews)
    const base =
      (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || "http://localhost:3000").replace(/\/+$/, "");

    // After recovery, Supabase redirects here:
    //   /auth/callback?next=/auth/set-password?next=<next>
    const innerNext = `/auth/set-password?next=${encodeURIComponent(next)}`;

    const callbackUrl = new URL("/auth/callback", base);
    callbackUrl.searchParams.set("next", innerNext);
    const redirectTo = callbackUrl.toString();

    const admin = createClient(url, service, { auth: { persistSession: false } });

    const linkRes = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkRes.error) {
      // Avoid leaking internals in production
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        isProd
          ? { error: "generateLink(recovery) failed" }
          : { error: "generateLink(recovery) failed", details: linkRes.error },
        { status: 400 }
      );
    }

    // In production, do NOT return the action_link (security footgun).
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      return NextResponse.json({
        ok: true,
        email,
      });
    }

    // Dev/local convenience: return the action link to test flows quickly.
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
      next,
      redirect_to: redirectTo,
      action_link: actionLink,
      dev_only: true,
    });
  } catch (e: any) {
    console.error("RECOVERY_ROUTE_UNCAUGHT_ERROR", e);
    return NextResponse.json(
      { error: "Unhandled server error in /api/auth/recovery", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
