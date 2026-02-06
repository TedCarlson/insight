import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import crypto from "crypto";
import { Resend } from "resend";

type Body = {
  email: string;
  purpose?: "reset" | "invite";
};

function normalizeEmail(email: string) {
  return (email ?? "").trim().toLowerCase();
}

function isLikelyEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomCode6(): string {
  // 6-digit numeric code
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const pepper = process.env.PASSWORD_CODE_PEPPER;

    if (!supabaseUrl) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    if (!serviceKey) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    if (!resendKey) return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    if (!from) return NextResponse.json({ error: "Missing RESEND_FROM_EMAIL" }, { status: 500 });
    if (!pepper) return NextResponse.json({ error: "Missing PASSWORD_CODE_PEPPER" }, { status: 500 });

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    const purpose = body.purpose ?? "reset";

    // Always return generic OK to avoid email enumeration
    if (!isLikelyEmail(email)) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const admin = supabaseAdmin();

    // Invalidate any existing unused code for this email (prevents unique-index conflict)
    await admin
      .from("password_setup_code")
      .update({ used_at: new Date().toISOString() })
      .eq("email", email)
      .is("used_at", null);

    const code = randomCode6();
    const codeHash = sha256(`${email}:${code}:${pepper}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const ins = await admin.from("password_setup_code").insert({
      email,
      code_hash: codeHash,
      expires_at: expiresAt,
      purpose,
    });

    if (ins.error) {
      // Still return generic OK
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const resend = new Resend(resendKey);

    // Keep message short + clear for deliverability
    const subject = purpose === "invite" ? "Your setup code" : "Your password reset code";
    const text =
      `Your ${purpose === "invite" ? "setup" : "password reset"} code is: ${code}\n\n` +
      `It expires in 10 minutes.\n\n` +
      `If you didn’t request this, you can ignore this email.`;

    const send = await resend.emails.send({
      from,
      to: email,
      subject,
      text,
    });

    // Even if send fails, do not leak info. But in non-prod, you may want to see it.
    if ((send as any)?.error && process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { ok: true, dev_note: "email_send_failed", details: (send as any).error },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    // Still generic OK to avoid enumeration
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, dev_error: e?.message ?? String(e) }, { status: 200 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}