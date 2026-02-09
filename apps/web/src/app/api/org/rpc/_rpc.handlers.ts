// apps/web/src/app/api/org/rpc/_rpc.handlers.ts
import type { RpcSchema } from "./_rpc.types";
import { json } from "./_rpc.utils";
import { makeServiceClient, withSchema } from "./_rpc.authz";

export async function handleOnboardGlobalRead(args: {
  rid: string;
  fn: string;
  schema: RpcSchema;
  rpcArgs: any;
}) {
  const { rid, fn, schema, rpcArgs } = args;

  const admin = makeServiceClient();
  if (!admin) {
    return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
  }

  const adminRpcClient: any = withSchema(admin, schema);
  const { data, error } = rpcArgs ? await adminRpcClient.rpc(fn, rpcArgs) : await adminRpcClient.rpc(fn);

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

export async function handlePersonUpsertServiceRole(args: {
  rid: string;
  fn: "person_upsert";
  schema: RpcSchema; // caller may pass "public" and that's ok
  rpcArgs: any;
}) {
  const { rid, fn, schema, rpcArgs } = args;

  const admin = makeServiceClient();
  if (!admin) {
    return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
  }

  const adminRpcClient: any = withSchema(admin, schema);
  const { data, error } = rpcArgs ? await adminRpcClient.rpc(fn, rpcArgs) : await adminRpcClient.rpc(fn);

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

export async function handlePersonPcOrgEndAssociation(args: {
  rid: string;
  person_id: string;
  pc_org_id: string;
  end_date: string; // already normalized
}) {
  const { rid, person_id, pc_org_id, end_date } = args;

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

export async function handleDefaultRpcAsUser(args: {
  rid: string;
  supabaseUser: any;
  schema: RpcSchema;
  fn: string;
  rpcArgs: any;
}) {
  const { rid, supabaseUser, schema, fn, rpcArgs } = args;

  const rpcClient: any = withSchema(supabaseUser, schema);
  const { data, error } = rpcArgs ? await rpcClient.rpc(fn, rpcArgs) : await rpcClient.rpc(fn);

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