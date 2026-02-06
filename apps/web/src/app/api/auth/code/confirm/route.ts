import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import crypto from "crypto";

type Body = {
  email: string;
  code: string;
  new_password: string;
};

function normalizeEmail(email: string) {
  return (email ?? "").trim().toLowerCase();
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function isStrongEnough(pw: string) {
  return typeof pw === "string" && pw.length >= 8;
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pepper = process.env.PASSWORD_CODE_PEPPER;

  if (!supabaseUrl) return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  if (!serviceKey) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  if (!pepper) return NextResponse.json({ error: "Missing PASSWORD_CODE_PEPPER" }, { status: 500 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const code = String(body.code ?? "").trim();
  const pw = String(body.new_password ?? "");

  if (!email || !code) return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
  if (!isStrongEnough(pw))
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const admin = supabaseAdmin();

  // Find the unused code row for this email
  const rowRes = await admin
    .from("password_setup_code")
    .select("password_setup_code_id, code_hash, expires_at, used_at, attempt_count, max_attempts")
    .eq("email", email)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rowRes.error || !rowRes.data) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  const row = rowRes.data as any;

  // Expired?
  const expiresAt = new Date(row.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    // mark used to clear the unique constraint slot
    await admin
      .from("password_setup_code")
      .update({ used_at: new Date().toISOString() })
      .eq("password_setup_code_id", row.password_setup_code_id);

    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  // Attempts exceeded?
  if ((row.attempt_count ?? 0) >= (row.max_attempts ?? 10)) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  // Verify hash match
  const expected = String(row.code_hash);
  const got = sha256(`${email}:${code}:${pepper}`);

  if (got !== expected) {
    // increment attempts
    await admin
      .from("password_setup_code")
      .update({ attempt_count: (row.attempt_count ?? 0) + 1 })
      .eq("password_setup_code_id", row.password_setup_code_id);

    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  // Code matches; mark used first (one-time)
  const usedAt = new Date().toISOString();
  const mark = await admin
    .from("password_setup_code")
    .update({ used_at: usedAt })
    .eq("password_setup_code_id", row.password_setup_code_id);

  if (mark.error) {
    return NextResponse.json({ error: "Failed to confirm code. Try again." }, { status: 500 });
  }

  // Find the auth user by email
  const userRes = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (userRes.error) return NextResponse.json({ error: "User lookup failed." }, { status: 500 });

  const matchUser = userRes.data?.users?.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
  if (!matchUser?.id) {
    // Keep it generic but this is real
    return NextResponse.json({ error: "No account found for that email." }, { status: 400 });
  }

  // Set password using admin API
  const upd = await admin.auth.admin.updateUserById(matchUser.id, {
    password: pw,
    user_metadata: { ...(matchUser.user_metadata ?? {}), password_set: true },
  });

  if (upd.error) {
    return NextResponse.json({ error: `Failed to set password: ${upd.error.message}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}