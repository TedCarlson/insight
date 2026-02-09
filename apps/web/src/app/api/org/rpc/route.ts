// apps/web/src/app/api/org/rpc/route.ts
import { NextRequest } from "next/server";
import { supabaseUserClient } from "@/shared/data/supabase/user";

import { RPC_ALLOWLIST, ONBOARD_GLOBAL_READS, type RpcRequest } from "./_rpc.types";
import { reqId, json, normalizeSchema, normalizeFn, parseCookies, extractPcOrgIdFromArgs } from "./_rpc.utils";
import {
  getSelectedPcOrgIdService,
  isOwnerUserClient,
  hasAnyRoleService,
  canAccessPcOrgUserClient,
  requirePermission,
  makeEnsureOrgScope,
} from "./_rpc.authz";
import {
  handleDefaultRpcAsUser,
  handleOnboardGlobalRead,
  handlePersonPcOrgEndAssociation,
  handlePersonUpsertServiceRole,
} from "./_rpc.handlers";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Functions that are allowed to default pc_org_id from the user's selected org (non-elevated only).
 * - For elevated users, cross-org is possible, so we REQUIRE explicit pc_org_id to prevent accidents.
 */
const DEFAULT_TO_SELECTED_ORG_FNS = new Set<string>([
  "add_to_roster",
  "assignment_start",
  "assignment_end",
  "assignment_patch",
  "person_pc_org_end_association", // (still uses explicit args path, but safe to list)
]);

export async function POST(req: NextRequest) {
  const rid = reqId();

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { ok: false, request_id: rid, error: "Missing Supabase env", code: "missing_env" });
    }

    const authHeader = req.headers.get("authorization") || "";
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
    const rpcArgs = (body?.args ?? null) as any;

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

    const ensureOrgScope = makeEnsureOrgScope({ rid, selectedPcOrgId, elevated });

    // Extract org id from args (covers both api/public patterns, including nested p_patch.pc_org_id)
    const pcOrgFromArgs = extractPcOrgIdFromArgs(rpcArgs);

    /**
     * ✅ Resolve "effective" org for this call.
     * - If args contains pc_org_id => use it
     * - Else if fn is allowed to default and user is NOT elevated => use selectedPcOrgId
     * - Else => empty (will be rejected by gates that require org)
     */
    const effectivePcOrgId =
      pcOrgFromArgs ||
      (!elevated && DEFAULT_TO_SELECTED_ORG_FNS.has(fn) ? String(selectedPcOrgId ?? "").trim() : "");

    /**
     * ✅ Elevated cross-org safety:
     * If user is elevated AND this fn requires org scoping, require explicit pc_org_id.
     * (Prevents accidental writes to "selected org" when an admin intended another org.)
     */
    if (elevated && DEFAULT_TO_SELECTED_ORG_FNS.has(fn) && !pcOrgFromArgs) {
      return json(400, {
        ok: false,
        request_id: rid,
        error: "Missing pc_org_id (required for elevated users)",
        code: "missing_pc_org_id",
        fn,
      });
    }

    // ✅ For elevated users acting cross-org: still require baseline access to target org
    if (effectivePcOrgId && elevated) {
      const ok = await canAccessPcOrgUserClient(supabaseUser, effectivePcOrgId);
      if (!ok) {
        return json(403, {
          ok: false,
          request_id: rid,
          error: "Forbidden",
          code: "forbidden",
          debug: { reason: "elevated_but_no_baseline_access", pc_org_id: effectivePcOrgId },
        });
      }
    }

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

      return handleOnboardGlobalRead({ rid, fn, schema, rpcArgs });
    }

    // ✅ Fine-grained permission gates for sensitive RPCs (must have explicit org, or selected if non-elevated + allowed)
    if (
      fn === "permission_grant" ||
      fn === "permission_revoke" ||
      fn === "pc_org_eligibility_grant" ||
      fn === "pc_org_eligibility_revoke"
    ) {
      const scope = ensureOrgScope(effectivePcOrgId);
      if (!scope.ok) return json(scope.status, scope.body);

      const allowed = await requirePermission(supabaseUser, effectivePcOrgId, "permissions_manage");
      if (!allowed) {
        return json(403, {
          ok: false,
          request_id: rid,
          error: "Forbidden",
          code: "forbidden",
          required_permission: "permissions_manage",
          pc_org_id: effectivePcOrgId,
        });
      }

      return handleDefaultRpcAsUser({ rid, supabaseUser, schema, fn, rpcArgs });
    }

    // ✅ Roster-manage gated writes (membership + assignment lifecycle + assignment_patch)
    if (fn === "add_to_roster" || fn === "assignment_start" || fn === "assignment_end" || fn === "assignment_patch") {
      const scope = ensureOrgScope(effectivePcOrgId);
      if (!scope.ok) return json(scope.status, scope.body);

      const allowed = await requirePermission(supabaseUser, effectivePcOrgId, "roster_manage");
      if (!allowed) {
        return json(403, {
          ok: false,
          request_id: rid,
          error: "Forbidden",
          code: "forbidden",
          required_permission: "roster_manage",
          pc_org_id: effectivePcOrgId,
        });
      }

      return handleDefaultRpcAsUser({ rid, supabaseUser, schema, fn, rpcArgs });
    }

    /**
     * Direct table write: person_pc_org_end_association
     * Still service-role, still permission-gated by roster_manage.
     *
     * NOTE: This handler expects pc_org_id in the direct args.
     * If you want to allow omitting pc_org_id here (default to selected org),
     * you can safely set pc_org_id = effectivePcOrgId when rpcArgs.pc_org_id is empty.
     */
    if (schema === "public" && fn === "person_pc_org_end_association") {
      const person_id = String(rpcArgs?.person_id ?? "").trim();
      const pc_org_id_direct = String(rpcArgs?.pc_org_id ?? "").trim();
      const pc_org_id = pc_org_id_direct || effectivePcOrgId;

      const end_date_raw = rpcArgs?.end_date ? String(rpcArgs.end_date).trim() : "";
      const end_date = end_date_raw ? end_date_raw : new Date().toISOString().slice(0, 10);

      if (!person_id || !pc_org_id) {
        return json(400, {
          ok: false,
          request_id: rid,
          error: "Missing person_id or pc_org_id",
          code: "missing_keys",
        });
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

      return handlePersonPcOrgEndAssociation({ rid, person_id, pc_org_id, end_date });
    }

    // person_upsert: service role execution but still roster_manage gated (by SELECTED org)
    if (fn === "person_upsert") {
      if (!selectedPcOrgId && !elevated) {
        return json(409, { ok: false, request_id: rid, error: "No selected org", code: "no_selected_pc_org" });
      }
      if (!elevated) {
        const allowed = await requirePermission(supabaseUser, selectedPcOrgId as string, "roster_manage");
        if (!allowed) return json(403, { ok: false, request_id: rid, error: "Forbidden", code: "forbidden" });
      }

      return handlePersonUpsertServiceRole({ rid, fn: "person_upsert", schema, rpcArgs });
    }

    // Default: execute RPC as the real user (auth.uid() present)
    return handleDefaultRpcAsUser({ rid, supabaseUser, schema, fn, rpcArgs });
  } catch (e: any) {
    return json(500, { ok: false, request_id: rid, error: e?.message ?? "Unknown error", code: "exception" });
  }
}