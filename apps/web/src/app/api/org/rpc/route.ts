// apps/web/src/app/api/org/rpc/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

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

async function getSelectedPcOrgId(supabase: any, auth_user_id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.selected_pc_org_id as string | null) ?? null;
}

async function isOwner(supabase: any): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_owner");
  if (error) return false;
  return Boolean(data);
}

async function requirePermission(supabase: any, pc_org_id: string, permission_key: string): Promise<boolean> {
  const apiClient: any = (supabase as any).schema ? (supabase as any).schema("api") : supabase;
  const { data, error } = await apiClient.rpc("has_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_key: permission_key,
  });
  if (error) return false;
  return Boolean(data);
}

type RpcSchema = "api" | "public";

type RpcRequest = {
  schema?: RpcSchema;
  fn?: string;
  args?: Record<string, any> | null;
};

function reqId() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

// Normalize schema input
function normalizeSchema(v: any): RpcSchema | null {
  if (v === "public" || v === "api") return v;
  return null;
}

// Normalize fn
function normalizeFn(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s;
}

function parseCookies(cookieHeader: string) {
  const out: Record<string, string> = {};
  const parts = cookieHeader.split(";").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = decodeURIComponent(part.slice(0, eq).trim());
    const v = decodeURIComponent(part.slice(eq + 1).trim());
    out[k] = v;
  }
  return out;
}

export async function POST(req: NextRequest) {
  const rid = reqId();

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, {
        ok: false,
        request_id: rid,
        error: "Missing Supabase env",
        code: "missing_env",
      });
    }

    const authHeader = req.headers.get("authorization") || "";

    // Use auth header if provided, otherwise rely on cookies (so auth.uid() works inside DB functions)
    const gatewayHeaders: Record<string, string> = { "x-rpc-gateway": "1" };
    if (authHeader) gatewayHeaders["Authorization"] = authHeader;

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: gatewayHeaders },
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

    const selectedPcOrgId = await getSelectedPcOrgId(supabaseUser, user.id);
    const owner = await isOwner(supabaseUser);

    function ensureOrgScope(targetPcOrgId: string, requiredSelected: boolean = true) {
      if (!targetPcOrgId) {
        return {
          ok: false as const,
          status: 400,
          body: { ok: false, request_id: rid, error: "Missing pc_org_id", code: "missing_pc_org_id" },
        };
      }
      if (requiredSelected && !selectedPcOrgId && !owner) {
        return {
          ok: false as const,
          status: 409,
          body: { ok: false, request_id: rid, error: "No selected org", code: "no_selected_pc_org" },
        };
      }
      if (selectedPcOrgId && targetPcOrgId !== selectedPcOrgId && !owner) {
        return {
          ok: false as const,
          status: 403,
          body: { ok: false, request_id: rid, error: "Forbidden (org mismatch)", code: "org_mismatch" },
        };
      }
      return { ok: true as const };
    }

    /**
     * IMPORTANT: direct table write: person_pc_org_end_association
     * This write intentionally uses service role to bypass RLS,
     * but MUST be permission-gated.
     */
    if (schema === "public" && fn === "person_pc_org_end_association") {
      const person_id = String(args?.person_id ?? "").trim();
      const pc_org_id = String(args?.pc_org_id ?? "").trim();
      const end_date_raw = args?.end_date ? String(args.end_date).trim() : "";
      const end_date = end_date_raw ? end_date_raw : new Date().toISOString().slice(0, 10);

      if (!person_id || !pc_org_id) {
        return json(400, { ok: false, request_id: rid, error: "Missing person_id or pc_org_id", code: "missing_keys" });
      }

      const scope = ensureOrgScope(pc_org_id);
      if (!scope.ok) return json(scope.status, scope.body);

      const allowed = await requirePermission(supabaseUser, pc_org_id, "roster_manage");
      if (!allowed) {
        return json(403, {
          ok: false,
          request_id: rid,
          error: "Forbidden",
          code: "forbidden",
          required_permission: "roster_manage",
          pc_org_id,
        });
      }

      const today = new Date().toISOString().slice(0, 10);

      if (!SUPABASE_SERVICE_ROLE_KEY) {
        return json(500, { ok: false, request_id: rid, error: "Missing service role key", code: "missing_service_key" });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: updatedRows, error: updateErr } = await supabaseAdmin
        .from("person_pc_org")
        .update({ end_date, status: "inactive", updated_at: new Date().toISOString() })
        .eq("person_id", person_id)
        .eq("pc_org_id", pc_org_id)
        .select();

      if (updateErr) {
        return json(500, { ok: false, request_id: rid, error: updateErr.message, code: "update_failed" });
      }

      if (!updatedRows || updatedRows.length === 0) {
        return json(404, { ok: false, request_id: rid, error: "Association not found", code: "not_found" });
      }

      // keep v_roster_current coherent (if you have a materialized view refresh, do it here later)
      const end = end_date || today;
      return json(200, { ok: true, request_id: rid, data: { ok: true, end_date: end, updated: updatedRows[0] } });
    }

    // Fine-grained permission gates for sensitive RPCs
    const pcOrgFromArgs = String((args?.pc_org_id ?? args?.p_pc_org_id ?? args?.pcOrgId ?? args?.pc_org) ?? "").trim();

    if (fn === "permission_grant" || fn === "permission_revoke") {
      const scope = ensureOrgScope(pcOrgFromArgs);
      if (!scope.ok) return json(scope.status, scope.body);

      const allowed = await requirePermission(supabaseUser, pcOrgFromArgs, "permissions_manage");
      if (!allowed) {
        return json(403, {
          ok: false,
          request_id: rid,
          error: "Forbidden",
          code: "forbidden",
          required_permission: "permissions_manage",
          pc_org_id: pcOrgFromArgs,
        });
      }
    }

    if (fn === "pc_org_eligibility_grant" || fn === "pc_org_eligibility_revoke") {
      const scope = ensureOrgScope(pcOrgFromArgs);
      if (!scope.ok) return json(scope.status, scope.body);

      const allowed = await requirePermission(supabaseUser, pcOrgFromArgs, "permissions_manage");
      if (!allowed) {
        return json(403, {
          ok: false,
          request_id: rid,
          error: "Forbidden",
          code: "forbidden",
          required_permission: "permissions_manage",
          pc_org_id: pcOrgFromArgs,
        });
      }
    }

    // ✅ FIX: align Edge gate with DB + edge_permissions config
    // DB function asserts roster_manage, so Edge must require roster_manage too.
    if (fn === "wizard_process_to_roster") {
    const scope = ensureOrgScope(pcOrgFromArgs);
    if (!scope.ok) return json(scope.status, scope.body);

    // ✅ Must match DB gate: api.assert_pc_org_permission(..., 'roster_manage')
    const allowed = await requirePermission(supabaseUser, pcOrgFromArgs, "roster_manage");
    if (!allowed) {
      return json(403, {
        ok: false,
        request_id: rid,
        error: "Forbidden",
        code: "forbidden",
        required_permission: "roster_manage",
        pc_org_id: pcOrgFromArgs,
      });
    }
  }

    // For RPC calls, run as the real user so auth.uid() is present in the DB.
    const rpcClient: any = schema === "api" ? (supabaseUser as any).schema("api") : supabaseUser;
    const { data, error } = args ? await rpcClient.rpc(fn, args) : await rpcClient.rpc(fn);

    if (error) {
      return json(500, {
        ok: false,
        request_id: rid,
        error: error.message,
        code: (error as any)?.code ?? "rpc_failed", // <-- pass through PostgREST code e.g. PGRST203
        details: (error as any)?.details ?? null,
        hint: (error as any)?.hint ?? null,
        fn,
        schema,
      });
    }

    return json(200, { ok: true, request_id: rid, data });
  } catch (e: any) {
    return json(500, { ok: false, request_id: rid, error: e?.message ?? "Unknown error", code: "exception" });
  }
}