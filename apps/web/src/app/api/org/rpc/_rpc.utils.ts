// apps/web/src/app/api/org/rpc/_rpc.utils.ts
import { NextResponse } from "next/server";
import type { RpcSchema } from "./_rpc.types";

export function reqId() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

export function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export function normalizeSchema(v: any): RpcSchema | null {
  if (v === "public" || v === "api") return v;
  return null;
}

export function normalizeFn(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s;
}

export function parseCookies(cookieHeader: string) {
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

/**
 * Extract pc_org_id from common RPC arg shapes.
 * Supports:
 *  - direct args: pc_org_id / p_pc_org_id / pcOrgId / pc_org
 *  - nested patch shapes: p_patch.pc_org_id / patch.pc_org_id
 */
export function extractPcOrgIdFromArgs(args: any): string {
  const direct =
    args?.pc_org_id ??
    args?.p_pc_org_id ??
    args?.pcOrgId ??
    args?.pc_org ??
    null;

  const directId = String(direct ?? "").trim();
  if (directId) return directId;

  const nested =
    args?.p_patch?.pc_org_id ??
    args?.patch?.pc_org_id ??
    args?.p_payload?.pc_org_id ??
    args?.payload?.pc_org_id ??
    null;

  return String(nested ?? "").trim();
}