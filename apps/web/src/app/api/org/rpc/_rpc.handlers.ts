// apps/web/src/app/api/org/rpc/_rpc.handlers.ts
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { json } from "./_rpc.utils";
import type { RpcSchema } from "./_rpc.types";

function makeServiceClient() {
  try {
    return supabaseAdmin();
  } catch {
    return null;
  }
}

function adminRpcClient(admin: any, schema: RpcSchema) {
  return schema === "api" ? (admin as any).schema("api") : admin;
}

export async function handleDefaultRpcAsUser(args: {
  rid: string;
  supabaseUser: any;
  schema: RpcSchema;
  fn: string;
  rpcArgs: Record<string, any> | null;
}) {
  const { rid, supabaseUser, schema, fn, rpcArgs } = args;

  const rpcClient: any = schema === "api" ? (supabaseUser as any).schema("api") : supabaseUser;
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

  return json(200, { ok: true, request_id: rid, fn, schema, data });
}

export async function handleOnboardGlobalRead(args: {
  rid: string;
  fn: string;
  schema: RpcSchema;
  rpcArgs: Record<string, any> | null;
}) {
  const { rid, fn, schema, rpcArgs } = args;

  const admin = makeServiceClient();
  if (!admin) {
    return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
  }

  const client: any = adminRpcClient(admin, schema);
  const { data, error } = rpcArgs ? await client.rpc(fn, rpcArgs) : await client.rpc(fn);

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

  return json(200, { ok: true, request_id: rid, fn, schema, data });
}

export async function handlePersonUpsertServiceRole(args: {
  rid: string;
  fn: string;
  schema: RpcSchema;
  rpcArgs: Record<string, any> | null;
}) {
  const { rid, fn, schema, rpcArgs } = args;

  const admin = makeServiceClient();
  if (!admin) {
    return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
  }

  const client: any = adminRpcClient(admin, schema);
  const { data, error } = rpcArgs ? await client.rpc(fn, rpcArgs) : await client.rpc(fn);

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
  end_date: string;
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

export async function handleAddToRosterServiceRole(args: {
  rid: string;
  schema: RpcSchema;
  rpcArgs: Record<string, any> | null;
}) {
  const { rid, schema, rpcArgs } = args;

  const admin = makeServiceClient();
  if (!admin) {
    return json(500, { ok: false, request_id: rid, error: "Service client unavailable", code: "missing_service_key" });
  }

  const client: any = adminRpcClient(admin, schema);
  const { data, error } = rpcArgs ? await client.rpc("add_to_roster", rpcArgs) : await client.rpc("add_to_roster");

  if (error) {
    return json(500, {
      ok: false,
      request_id: rid,
      error: error.message,
      code: (error as any)?.code ?? "rpc_failed",
      details: (error as any)?.details ?? null,
      hint: (error as any)?.hint ?? null,
      fn: "add_to_roster",
      schema,
    });
  }

  return json(200, { ok: true, request_id: rid, fn: "add_to_roster", schema, data });
}