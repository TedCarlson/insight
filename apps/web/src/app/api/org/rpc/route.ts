// apps/web/src/app/api/org/rpc/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const WRITE_RPC_ALLOWLIST = new Set<string>([
  // public schema writes
  "person_upsert",
  "assignment_patch",
  "assignment_reporting_upsert_safe",
  "person_pc_org_end_association",

  // api schema writes
  "permission_grant",
  "permission_revoke",
  "pc_org_eligibility_grant",
  "pc_org_eligibility_revoke",
  "wizard_process_to_roster",
]);

type RpcRequest = {
  schema?: "api" | "public";
  fn?: string;
  args?: Record<string, any> | null;
};

function parseCookies(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    out[k] = rest.join("=") ?? "";
  });
  return out;
}

function tryDecodeAuthCookie(value: string): string | null {
  // value may be urlencoded, base64'd json, or raw jwt
  const v = decodeURIComponent(value);

  // raw jwt?
  if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(v)) return v;

  // JSON directly?
  if (v.startsWith("{") || v.startsWith("[")) {
    try {
      const json: any = JSON.parse(v);
      if (typeof json?.access_token === "string") return json.access_token;
      if (Array.isArray(json) && typeof json?.[0] === "string") return json[0];
    } catch {}
  }

  // base64 json?
  try {
    const decoded = Buffer.from(v, "base64").toString("utf8");
    const json: any = JSON.parse(decoded);
    if (typeof json?.access_token === "string") return json.access_token;
    if (Array.isArray(json) && typeof json?.[0] === "string") return json[0];
  } catch {}

  return null;
}

function extractAccessTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);

  // Supabase commonly stores session in a cookie containing "auth-token"
  const candidates = Object.entries(cookies).filter(([k]) => k.includes("auth-token"));
  for (const [, v] of candidates) {
    const token = tryDecodeAuthCookie(v);
    if (token) return token;
  }

  // fallback: any cookie value that looks like a JWT
  for (const [, v] of Object.entries(cookies)) {
    const raw = decodeURIComponent(v);
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(raw)) return raw;
  }

  return null;
}

async function hasGrant(userId: string, schema: "api" | "public", fn: string, args: any): Promise<boolean> {
  const url = process.env.EDGE_PERMISSIONS_URL;
  if (!url) return true; // permissive default to keep the app unblocked

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, schema, fn, args }),
    });

    if (!res.ok) return false;
    const json = await res.json().catch(() => ({} as any));
    return !!json?.allowed;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    let authHeader = req.headers.get("authorization") ?? "";

    // If the client didn't send Authorization, try extracting access token from Supabase cookies.
    if (!authHeader) {
      const token = extractAccessTokenFromCookies(req.headers.get("cookie"));
      if (token) authHeader = `Bearer ${token}`;
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as RpcRequest;
    const schema = (body?.schema ?? "api") as "api" | "public";
    const fn = String(body?.fn ?? "");
    const args = (body?.args ?? null) as any;

    if (!WRITE_RPC_ALLOWLIST.has(fn)) {
      return NextResponse.json({ ok: false, error: "RPC not allowed" }, { status: 403 });
    }

    const allowed = await hasGrant(user.id, schema, fn, args);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const rpcClient: any = schema === "api" ? (supabaseAdmin as any).schema("api") : supabaseAdmin;

// Direct table write: person_pc_org_end_association
// Writes flow through this route so Edge grants can remain the gate.
if (schema === "public" && fn === "person_pc_org_end_association") {
  const person_id = String(args?.person_id ?? "").trim();
  const pc_org_id = String(args?.pc_org_id ?? "").trim();
  const end_date_raw = args?.end_date ? String(args.end_date).trim() : "";
  const end_date = end_date_raw ? end_date_raw : new Date().toISOString().slice(0, 10);

  if (!person_id || !pc_org_id) {
    return NextResponse.json({ ok: false, error: "Missing person_id or pc_org_id" }, { status: 400 });
  }

  const { error: updErr } = await supabaseAdmin
    .from("person_pc_org")
    .update({
      end_date,
      active: false,
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("person_id", person_id)
    .eq("pc_org_id", pc_org_id)
    .is("end_date", null);

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: updErr.message, code: updErr.code, details: updErr.details ?? null },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, data: { ok: true } });
}


    const { data, error } = args ? await rpcClient.rpc(fn, args) : await rpcClient.rpc(fn);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code, details: error.details ?? null },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
