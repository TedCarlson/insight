// apps/web/src/app/api/org/rpc/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseUserClient } from "@/shared/data/supabase/user";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Onboard reads that must be "global visible" for roster managers
const ONBOARD_GLOBAL_READS = new Set<string>([
  "people_unassigned_search",
  "people_global_unassigned_search",
  "people_global_unassigned_search_any",
  "person_picker",
  "person_get",
]);

// Actively tied to UI events – do not remove
const RPC_ALLOWLIST = new Set<string>([
  // ----- Reads (Onboard pool / pickers) -----
  "people_unassigned_search",
  "people_global_unassigned_search",
  "people_global_unassigned_search_any",
  "person_picker",
  "person_get",

  // ----- Permission reads (UI gates) -----
  "has_pc_org_permission",
  "has_any_pc_org_permission",
  "permissions_for_org",
  "effective_permissions_for_org",
  "effective_permissions_for_org_admin",
  "is_app_owner",

  // ----- Writes -----
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
  "add_to_roster",
]);

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

function normalizeSchema(v: any): RpcSchema | null {
  if (v === "public" || v === "api") return v;
  return null;
}

function normalizeFn(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s;
}

function parseCookies(cookieHeader: string) {
  const out: Record<string, string> = {};
  const parts = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = decodeURIComponent(part.slice(0, eq).trim());
    const v = decodeURIComponent(part.slice(eq + 1).trim());
    out[k] = v;
  }
  return out;
}

function makeServiceClient() {
  try {
    return supabaseAdmin();
  } catch {
    return null;
  }
}

async function getSelectedPcOrgIdService(auth_user_id: string): Promise<string | null> {
  const svc = makeServiceClient();
  if (!svc) return null;

  const { data, error } = await svc
    .from("user_profile")
    .select("selected_pc_org_id")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle();

  if (error) return null;
  return (data?.selected_pc_org_id as string | null) ?? null;
}

async function isOwnerUserClient(supabaseUser: any): Promise<boolean> {
  const { data, error } = await supabaseUser.rpc("is_owner");
  if (error) return false;
  return Boolean(data);
}

async function hasAnyRoleService(auth_user_id: string, roleKeys: string[]): Promise<boolean> {
  const svc = makeServiceClient();
  if (!svc) return false;

  const { data, error } = await svc.from("user_roles").select("role_key").eq("auth_user_id", auth_user_id);
  if (error) return false;

  const roles = (data ?? []).map((r: any) => String(r?.role_key ?? "")).filter(Boolean);
  return roles.some((rk: string) => roleKeys.includes(rk));
}

async function canAccessPcOrgUserClient(supabaseUser: any, pc_org_id: string): Promise<boolean> {
  const apiClient: any = (supabaseUser as any).schema ? (supabaseUser as any).schema("api") : supabaseUser;
  const { data, error } = await apiClient.rpc("can_access_pc_org", { p_pc_org_id: pc_org_id });
  if (error) return false;
  return Boolean(data);
}

async function requirePermission(supabaseUser: any, pc_org_id: string, permission_key: string): Promise<boolean> {
  const apiClient: any = (supabaseUser as any).schema ? (supabaseUser as any).schema("api") : supabaseUser;
  const { data, error } = await apiClient.rpc("has_pc_org_permission", {
    p_pc_org_id: pc_org_id,
    p_permission_key: permission_key,
  });
  if (error) return false;
  return Boolean(data);
}

export async function POST(req: NextRequest) {
  const rid = reqId();

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { ok: false, request_id: rid, error: "Missing Supabase env", code: "missing_env" });
    }

    const authHeader = req.headers.get("authorization") || "";

    // Create "user" client (anon key) but with Authorization header forwarded (if present)
    const supabaseUser = supabaseUserClient({ authorization: authHeader });

    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    const user = userRes?.user;

    if (userErr || !user) {
      const cookieHeader = req.headers.get("cookie");
      const cookieKeys = cookieHeader ? Object.keys(parseCookies(cookieHeader)) : [];
      return json(401, {
        ok: false,
        request_id: rid,
        error: "Unauthorized",
        code: "unauthorized",
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

    if (!schema) return json(400, { ok: false, request_id: rid, error: "Invalid schema", code: "invalid_schema" });
    if (!fn) return json(400, { ok: false, request_id: rid, error: "Missing fn", code: "missing_fn" });
    if (!RPC_ALLOWLIST.has(fn)) {
      return json(403, { ok: false, request_id: rid, error: "RPC not allowed", code: "rpc_not_allowed", fn });
    }

    const userId = user.id;

    // ✅ Selected org MUST be read via service role to avoid RLS surprises
    const selectedPcOrgId = await getSelectedPcOrgIdService(userId);

    // Owner check (runs as user so you can keep owner logic centralized in DB)
    const owner = await isOwnerUserClient(supabaseUser);

    // ✅ Elevated role bypass (multi-org capable, but still must pass can_access_pc_org(target))
    const elevated = owner || (await hasAnyRoleService(userId, ["admin", "dev", "director", "vp"]));

    // ✅ Global visibility for Onboard reads:
    // If you can roster_manage your SELECTED org, you can read the global onboard pool.
    if (ONBOARD_GLOBAL_READS.has(fn)) {
      if (!selectedPcOrgId && !elevated) {
        return json(409, { ok: false, request_id: rid, error: "No selected org", code: "no_selected_pc_org" });
      }

      if (!elevated) {
        const allowed = await requirePermission(supabaseUser, selectedPcOrgId as string, "roster_manage");
        if (!allowed) {
          return json(403, {
            ok: false,
            request_id: rid,
            error: "Forbidden",
            code: "forbidden",
            required_permission: "roster_manage",
            pc_org_id: selectedPcOrgId,
          });
        }
      }
    }

    function ensureOrgScope(targetPcOrgId: string, requiredSelected: boolean = true) {
      if (!targetPcOrgId) {
        return {
          ok: false as const,
          status: 400,
          body: { ok: false, request_id: rid, error: "Missing pc_org_id", code: "missing_pc_org_id" },
        };
      }

      // If you require a selected org, enforce it for non-elevated users.
      if (requiredSelected && !selectedPcOrgId && !elevated) {
        return {
          ok: false as const,
          status: 409,
          body: { ok: false, request_id: rid, error: "No selected org", code: "no_selected_pc_org" },
        };
      }

      // Enforce org match for non-elevated users
      if (selectedPcOrgId && targetPcOrgId !== selectedPcOrgId && !elevated) {
        return {
          ok: false as const,
          status: 403,
          body: { ok: false, request_id: rid, error: "Forbidden (org mismatch)", code: "org_mismatch" },
        };
      }

      return { ok: true as const };
    }

    // Extract org id from args (covers both api/public patterns)
    const pcOrgFromArgs = String((args?.pc_org_id ?? args?.p_pc_org_id ?? args?.pcOrgId ?? args?.pc_org) ?? "").trim();

    // ✅ For elevated users acting cross-org: still require baseline access to target org
    if (pcOrgFromArgs && elevated) {
      const ok = await canAccessPcOrgUserClient(supabaseUser, pcOrgFromArgs);
      if (!ok) {
        return json(403, {
          ok: false,
          request_id: rid,
          error: "Forbidden",
          code: "forbidden",
          debug: { reason: "elevated_but_no_baseline_access", pc_org_id: pcOrgFromArgs },
        });
      }
    }

    /**
     * Direct table write: person_pc_org_end_association
     * Still service-role, still permission-gated by roster_manage.
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

      const admin = makeServiceClient();
      if (!admin) {
        return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
      }

      const { data: updatedRows, error: updateErr } = await admin
        .from("person_pc_org")
        .update({ end_date, status: "inactive", updated_at: new Date().toISOString() })
        .eq("person_id", person_id)
        .eq("pc_org_id", pc_org_id)
        .select();

      if (updateErr) return json(500, { ok: false, request_id: rid, error: updateErr.message, code: "update_failed" });
      if (!updatedRows || updatedRows.length === 0) {
        return json(404, { ok: false, request_id: rid, error: "Association not found", code: "not_found" });
      }

      return json(200, { ok: true, request_id: rid, data: { ok: true, end_date, updated: updatedRows[0] } });
    }

    // Fine-grained permission gates for sensitive RPCs
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

    // ✅ Permission read RPCs must be org-scoped (but do NOT recurse requirePermission)
    if (
      fn === "has_pc_org_permission" ||
      fn === "has_any_pc_org_permission" ||
      fn === "permissions_for_org" ||
      fn === "effective_permissions_for_org" ||
      fn === "effective_permissions_for_org_admin"
    ) {
      const scope = ensureOrgScope(pcOrgFromArgs);
      if (!scope.ok) return json(scope.status, scope.body);
    }

    // ✅ Wizard must match DB gate (roster_manage)
    if (fn === "add_to_roster") {
      const scope = ensureOrgScope(pcOrgFromArgs);
      if (!scope.ok) return json(scope.status, scope.body);

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

    // ✅ Global onboard reads execute via service role (permission-gated above)
    if (ONBOARD_GLOBAL_READS.has(fn)) {
      const admin = makeServiceClient();
      if (!admin) {
        return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
      }

      const adminRpcClient: any = schema === "api" ? (admin as any).schema("api") : admin;
      const { data, error } = args ? await adminRpcClient.rpc(fn, args) : await adminRpcClient.rpc(fn);

      if (error) {
        return json(500, {
          ok: false,
          request_id: rid,
          error: error.message,
          code: (error as any)?.code ?? "rpc_failed",
          details: (error as any)?.details ?? null,
          hint: (error as any)?.hint ?? null,
          fn,
          schema,
        });
      }

      return json(200, {
        ok: true,
        request_id: rid,
        build: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_REF ?? "local",
        fn,
        schema,
        data,
      });
    }

    // person_upsert: service role execution but still roster_manage gated
    if (fn === "person_upsert") {
      if (!selectedPcOrgId && !elevated) {
        return json(409, { ok: false, request_id: rid, error: "No selected org", code: "no_selected_pc_org" });
      }
      if (!elevated) {
        const allowed = await requirePermission(supabaseUser, selectedPcOrgId as string, "roster_manage");
        if (!allowed) return json(403, { ok: false, request_id: rid, error: "Forbidden", code: "forbidden" });
      }

      const admin = makeServiceClient();
      if (!admin) {
        return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
      }

      const adminRpcClient: any = schema === "api" ? (admin as any).schema("api") : admin;
      const { data, error } = args ? await adminRpcClient.rpc(fn, args) : await adminRpcClient.rpc(fn);

      if (error) {
        return json(500, {
          ok: false,
          request_id: rid,
          error: error.message,
          code: (error as any)?.code ?? "rpc_failed",
          fn,
          schema,
        });
      }

      return json(200, { ok: true, request_id: rid, fn, schema, data });
    }

    // Default: execute RPC as the real user (auth.uid() present)
    const rpcClient: any = schema === "api" ? (supabaseUser as any).schema("api") : supabaseUser;
    const { data, error } = args ? await rpcClient.rpc(fn, args) : await rpcClient.rpc(fn);

    if (error) {
      return json(500, {
        ok: false,
        request_id: rid,
        error: error.message,
        code: (error as any)?.code ?? "rpc_failed",
        details: (error as any)?.details ?? null,
        hint: (error as any)?.hint ?? null,
        fn,
        schema,
      });
    }

    return json(200, {
      ok: true,
      request_id: rid,
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_REF ?? "local",
      fn,
      schema,
      data,
    });
  } catch (e: any) {
    return json(500, { ok: false, request_id: rid, error: e?.message ?? "Unknown error", code: "exception" });
  }
}