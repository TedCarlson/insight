// apps/web/src/app/api/org/rpc/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EDGE_PERMISSIONS_URL = process.env.EDGE_PERMISSIONS_URL ?? "";

// Actively tied to UI events – do not remove
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

type RpcSchema = "api" | "public";

type RpcRequest = {
  schema?: RpcSchema;
  fn?: string;
  args?: Record<string, any> | null;
};

function requestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

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
  const v = decodeURIComponent(value);

  // raw jwt?
  if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(v)) return v;

  // JSON directly?
  if (v.startsWith("{") || v.startsWith("[")) {
    try {
      const jsonVal: any = JSON.parse(v);
      if (typeof jsonVal?.access_token === "string") return jsonVal.access_token;
      if (Array.isArray(jsonVal) && typeof jsonVal?.[0] === "string") return jsonVal[0];
    } catch {
      // ignore
    }
  }

  // base64 json?
  try {
    const decoded = Buffer.from(v, "base64").toString("utf8");
    const jsonVal: any = JSON.parse(decoded);
    if (typeof jsonVal?.access_token === "string") return jsonVal.access_token;
    if (Array.isArray(jsonVal) && typeof jsonVal?.[0] === "string") return jsonVal[0];
  } catch {
    // ignore
  }

  return null;
}

function joinChunkedCookie(cookies: Record<string, string>, keyContains: string): string | null {
  // Supabase / Next may chunk cookies like:
  //   sb-<ref>-auth-token.0, sb-<ref>-auth-token.1 ...
  const chunkEntries = Object.entries(cookies)
    .map(([k, v]) => {
      const m = k.match(/^(.*)\.(\d+)$/);
      if (!m) return null;
      const base = m[1];
      const idx = Number(m[2]);
      if (!Number.isFinite(idx)) return null;
      if (!base.includes(keyContains)) return null;
      return { base, idx, v };
    })
    .filter(Boolean) as Array<{ base: string; idx: number; v: string }>;

  if (chunkEntries.length === 0) return null;

  const groups = new Map<string, Array<{ idx: number; v: string }>>();
  for (const c of chunkEntries) {
    const arr = groups.get(c.base) ?? [];
    arr.push({ idx: c.idx, v: c.v });
    groups.set(c.base, arr);
  }

  let bestBase: string | null = null;
  let bestCount = 0;
  for (const [base, arr] of groups.entries()) {
    if (arr.length > bestCount) {
      bestBase = base;
      bestCount = arr.length;
    }
  }

  if (!bestBase) return null;

  const parts = (groups.get(bestBase) ?? []).sort((a, b) => a.idx - b.idx);
  return parts.map((p) => p.v).join("");
}

function extractAccessTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);

  // 0) Try chunked access-token cookies first
  const chunkedAccess = joinChunkedCookie(cookies, "access-token");
  if (chunkedAccess) {
    const raw = decodeURIComponent(chunkedAccess);
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(raw)) return raw;
    const token = tryDecodeAuthCookie(chunkedAccess);
    if (token) return token;
  }

  // 1) Any cookie key that contains "access-token"
  const accessTokenCandidates = Object.entries(cookies).filter(([k]) => k.includes("access-token"));
  for (const [, v] of accessTokenCandidates) {
    const raw = decodeURIComponent(v);
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(raw)) return raw;
    const token = tryDecodeAuthCookie(v);
    if (token) return token;
  }

  // 2) Try chunked auth-token cookies (common)
  const chunkedAuth = joinChunkedCookie(cookies, "auth-token");
  if (chunkedAuth) {
    const token = tryDecodeAuthCookie(chunkedAuth);
    if (token) return token;

    const raw = decodeURIComponent(chunkedAuth);
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(raw)) return raw;
  }

  // 3) Non-chunked auth-token cookies
  const authTokenCandidates = Object.entries(cookies).filter(([k]) => k.includes("auth-token"));
  for (const [, v] of authTokenCandidates) {
    const token = tryDecodeAuthCookie(v);
    if (token) return token;
  }

  // 4) Last resort: any cookie value that looks like a JWT
  for (const [, v] of Object.entries(cookies)) {
    const raw = decodeURIComponent(v);
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(raw)) return raw;
  }

  return null;
}

function normalizeSchema(x: any): RpcSchema | null {
  if (x === "api" || x === "public") return x;
  return null;
}

function normalizeFn(x: any): string {
  return String(x ?? "").trim();
}

/**
 * Permissions gate
 * - If EDGE_PERMISSIONS_URL is missing:
 *   - allow in dev/test
 *   - deny in production (fail-closed)
 */
async function hasGrant(userId: string, schema: RpcSchema, fn: string, args: any): Promise<boolean> {
  if (!EDGE_PERMISSIONS_URL) {
    return process.env.NODE_ENV !== "production";
  }

  try {
    const res = await fetch(EDGE_PERMISSIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, schema, fn, args }),
    });

    if (!res.ok) return false;
    const jsonVal = await res.json().catch(() => ({} as any));
    return !!jsonVal?.allowed;
  } catch {
    return false;
  }
}

function httpStatusForRpcError(err: any): number {
  const code = String(err?.code ?? "");
  const msg = String(err?.message ?? "");

  // Common Postgres RAISE EXCEPTION used as app-layer Unauthorized/Forbidden
  if (code === "P0001" && /unauthorized/i.test(msg)) return 401;
  if (code === "P0001" && /forbidden|permission/i.test(msg)) return 403;

  return 400;
}

export async function GET() {
  return json(405, { ok: false, error: "Method Not Allowed", allowed: ["POST"] });
}

export async function POST(req: NextRequest) {
  const rid = requestId();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, {
      ok: false,
      request_id: rid,
      error: "Server misconfigured",
      code: "config_missing",
      missing: {
        NEXT_PUBLIC_SUPABASE_URL: !SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  }

  try {
    // Authorization header OR extracted from cookies
    let authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) {
      const token = extractAccessTokenFromCookies(req.headers.get("cookie"));
      if (token) authHeader = `Bearer ${token}`;
    }

    // Authenticate as the real user (so auth.uid() works inside DB functions)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    const user = userRes?.user;

    if (userErr || !user) {
      const cookieHeader = req.headers.get("cookie");
      const cookieKeys = cookieHeader ? Object.keys(parseCookies(cookieHeader)) : [];
      return json(401, {
        ok: false,
        request_id: rid,
        error: "Unauthorized",
        debug: {
          has_authorization_header: Boolean(req.headers.get("authorization")),
          cookie_key_count: cookieKeys.length,
          cookie_keys: cookieKeys.slice(0, 30),
        },
      });
    }

    const body = (await req.json().catch(() => ({}))) as RpcRequest;
    const schema = normalizeSchema(body?.schema ?? "api");
    const fn = normalizeFn(body?.fn);
    const args = (body?.args ?? null) as any;

    if (!schema) {
      return json(400, { ok: false, request_id: rid, error: "Invalid schema", code: "invalid_schema" });
    }
    if (!fn) {
      return json(400, { ok: false, request_id: rid, error: "Missing fn", code: "missing_fn" });
    }
    if (!WRITE_RPC_ALLOWLIST.has(fn)) {
      return json(403, { ok: false, request_id: rid, error: "RPC not allowed", code: "rpc_not_allowed", fn });
    }

    const allowed = await hasGrant(user.id, schema, fn, args);
    if (!allowed) {
      return json(403, { ok: false, request_id: rid, error: "Forbidden", code: "forbidden", fn, schema });
    }

    /**
     * IMPORTANT: direct table write: person_pc_org_end_association
     * This write intentionally uses service role to bypass RLS,
     * but is gated by Edge grants above.
     */
    if (schema === "public" && fn === "person_pc_org_end_association") {
      const person_id = String(args?.person_id ?? "").trim();
      const pc_org_id = String(args?.pc_org_id ?? "").trim();
      const end_date_raw = args?.end_date ? String(args.end_date).trim() : "";
      const end_date = end_date_raw ? end_date_raw : new Date().toISOString().slice(0, 10);

      if (!person_id || !pc_org_id) {
        return json(400, { ok: false, request_id: rid, error: "Missing person_id or pc_org_id", code: "missing_keys" });
      }

      const today = new Date().toISOString().slice(0, 10);

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: updatedRows, error: updErr } = await supabaseAdmin
        .from("person_pc_org")
        .update({
          end_date: end_date ?? today,
          active: false,
          status: "inactive",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("person_id", person_id)
        .eq("pc_org_id", pc_org_id)
        .eq("active", true)
        .select("person_id,pc_org_id,active,end_date")
        .limit(5);

      if (updErr) {
        return json(400, {
          ok: false,
          request_id: rid,
          error: updErr.message,
          code: updErr.code ?? "update_failed",
          details: (updErr as any).details ?? null,
        });
      }

      if (!updatedRows || updatedRows.length === 0) {
        return json(404, {
          ok: false,
          request_id: rid,
          error:
            "No active person↔org association row found to end (already ended, missing membership row, or membership key mismatch).",
          code: "no_active_membership",
        });
      }

      return json(200, { ok: true, request_id: rid, data: { ok: true, updated: updatedRows[0] } });
    }

    // For RPC calls, run as the real user so auth.uid() is present in the DB.
    const rpcClient: any = schema === "api" ? (supabaseUser as any).schema("api") : supabaseUser;
    const { data, error } = args ? await rpcClient.rpc(fn, args) : await rpcClient.rpc(fn);

    if (error) {
      const status = httpStatusForRpcError(error);
      return json(status, {
        ok: false,
        request_id: rid,
        error: error.message,
        code: error.code ?? null,
        details: (error as any).details ?? null,
        fn,
        schema,
      });
    }

    return json(200, { ok: true, request_id: rid, data });
  } catch (e: any) {
    return json(500, { ok: false, request_id: rid, error: String(e?.message ?? e), code: "unhandled_exception" });
  }
}
