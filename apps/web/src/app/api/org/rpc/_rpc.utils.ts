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

function str(v: unknown) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

export function extractPcOrgIdFromArgs(args: any): string {
  const top =
    str(args?.pc_org_id) ||
    str(args?.p_pc_org_id) ||
    str(args?.pcOrgId) ||
    str(args?.pc_org) ||
    str(args?.pPcOrgId);

  if (top) return top;

  const patch =
    str(args?.p_patch?.pc_org_id) ||
    str(args?.patch?.pc_org_id) ||
    str(args?.p_patch?.p_pc_org_id) ||
    str(args?.patch?.p_pc_org_id);

  return patch;
}