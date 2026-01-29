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

function isRateLimitError(err: unknown): boolean {
  const status = (err as any)?.status ?? (err as any)?.code;
  const msg = String((err as any)?.message ?? "").toLowerCase();
  return (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("email rate") ||
    msg.includes("too many requests")
  );
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // IMPORTANT: For end-user "Forgot password", use the anon key + resetPasswordForEmail()
    // This sends the email. Admin generateLink() only generates a link; it does NOT send.
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }
    if (!anon) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY" }, { status: 500 });
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

    const client = createClient(url, anon, { auth: { persistSession: false } });

    // This triggers Supabase to email the password reset link (the correct UX for "Forgot password")
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      if (isRateLimitError(error)) {
        return NextResponse.json(
          {
            error: "email_rate_limited",
            message: "Too many email attempts. Please wait a few minutes and try again.",
          },
          { status: 429 }
        );
      }

      // Do NOT leak whether the user exists (avoid enumeration).
      // Treat all other errors (including "user not found" / 404 cases) as generic success.
      if (process.env.NODE_ENV !== "production") {
        console.warn("RECOVERY_ROUTE_RESET_EMAIL_ERROR", error);
      }

      return NextResponse.json({ ok: true, email }, { status: 200 });
    }

    // Always generic success
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      return NextResponse.json({ ok: true, email }, { status: 200 });
    }

    // Dev-only convenience:
    // If you *also* want an action_link to test flows quickly, we can optionally generate it
    // using SERVICE_ROLE, but do NOT rely on it to email the user.
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (service) {
      try {
        const admin = createClient(url, service, { auth: { persistSession: false } });
        const linkRes = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo },
        });

        const actionLink = (linkRes.data as any)?.properties?.action_link ?? null;

        return NextResponse.json({
          ok: true,
          email,
          next,
          redirect_to: redirectTo,
          action_link: actionLink,
          dev_only: true,
          note: actionLink
            ? "resetPasswordForEmail() sent an email; action_link is provided only for local testing."
            : "resetPasswordForEmail() sent an email; action_link not available (generateLink failed or returned none).",
          generate_link_error: linkRes.error ?? null,
        });
      } catch (e) {
        console.warn("RECOVERY_ROUTE_DEV_GENERATELINK_ERROR", e);
        return NextResponse.json({
          ok: true,
          email,
          next,
          redirect_to: redirectTo,
          dev_only: true,
          note: "resetPasswordForEmail() sent an email; dev action_link generation failed.",
        });
      }
    }

    // If no service key in dev, still succeed; just no action_link.
    return NextResponse.json({
      ok: true,
      email,
      next,
      redirect_to: redirectTo,
      dev_only: true,
      note: "resetPasswordForEmail() sent an email; no SUPABASE_SERVICE_ROLE_KEY so no action_link returned.",
    });
  } catch (e: any) {
    console.error("RECOVERY_ROUTE_UNCAUGHT_ERROR", e);
    return NextResponse.json(
      { error: "Unhandled server error in /api/auth/recovery", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
