import type { PersonRow } from "../types";
import type { ApiModuleCtx } from "./_ctx";

export async function personGet(ctx: ApiModuleCtx, person_id: string): Promise<PersonRow | null> {
  const data = await ctx.rpcWithFallback<any>("person_get", [
    { p_person_id: person_id },
    { person_id },
    { p_id: person_id },
    { id: person_id },
  ]);
  return data ?? null;
}

export async function peopleAll(ctx: ApiModuleCtx, query = "", limit = 25): Promise<PersonRow[]> {
  const p_query = query ?? "";
  const p_limit = limit ?? 25;
  const data = await ctx.rpcWithFallback<any[]>("people_all", [
    { p_query, p_limit },
    { query: p_query, limit: p_limit },
    { p_q: p_query, p_lim: p_limit },
  ]);
  return (data as any[])?.map((r) => r as PersonRow) ?? [];
}

export async function peopleGlobalUnassignedSearch(
  ctx: ApiModuleCtx,
  query = "",
  limit = 25
): Promise<PersonRow[]> {
  const p_query = query ?? "";
  const p_limit = limit ?? 25;

  try {
    const data = await ctx.rpcWithFallback<any[]>("people_global_unassigned_search", [
      { p_query, p_limit },
      { query: p_query, limit: p_limit },
    ]);
    return (data as any[])?.map((r) => r as PersonRow) ?? [];
  } catch (e) {
    const { data, error } = await (ctx.supabase as any).rpc("people_global_unassigned_search", {
      p_query,
      p_limit,
    });
    if (error) throw ctx.normalize(error);
    return (data as any[])?.map((r) => r as PersonRow) ?? [];
  }
}

export async function peopleGlobalUnassignedSearchAny(
  ctx: ApiModuleCtx,
  input?: {
    query?: string;
    limit?: number;
    active_filter?: "active" | "inactive" | null | string;
    p_active_filter?: "active" | "inactive" | null | string;
  }
): Promise<PersonRow[]> {
  const p_query = String(input?.query ?? "").trim();
  const p_limit = Number(input?.limit ?? 25);
  const p_active_filter = (input as any)?.p_active_filter ?? (input as any)?.active_filter ?? null;

  const data = await ctx.rpcWrite<any[]>("public", "people_global_unassigned_search_any", {
    p_query,
    p_limit,
    p_active_filter,
  });

  return (Array.isArray(data) ? data : []) as unknown as PersonRow[];
}

export async function personUpsert(
  ctx: ApiModuleCtx,
  input: {
    person_id: string;
    full_name?: string | null;
    emails?: string | null;
    mobile?: string | null;
    fuse_emp_id?: string | null;
    person_notes?: string | null;
    person_nt_login?: string | null;
    person_csg_id?: string | null;
    active?: boolean | null;
    co_ref_id?: string | null;
    co_code?: string | null;
    role?: string | null;
  }
): Promise<PersonRow | null> {
  const baseArgs = ctx.compactRecord({
    p_person_id: input.person_id,
    p_full_name: input.full_name ?? undefined,
    p_emails: input.emails ?? undefined,
    p_mobile: input.mobile ?? undefined,
    p_fuse_emp_id: input.fuse_emp_id ?? undefined,
    p_person_notes: input.person_notes ?? undefined,
    p_person_nt_login: input.person_nt_login ?? undefined,
    p_person_csg_id: input.person_csg_id ?? undefined,
    p_active: input.active ?? undefined,
    p_co_ref_id: input.co_ref_id ?? undefined,
    ...(input.co_code !== undefined ? { p_co_code: input.co_code } : {}),
    ...(input.role !== undefined ? { p_role: input.role } : {}),
  });

  try {
    const data = await ctx.rpcWrite<any>("public", "person_upsert", baseArgs as any);
    return (data as any) ?? null;
  } catch (e: any) {
    const code = String(e?.code ?? "");
    const msg = String(e?.message ?? "");
    const ambiguous = code === "PGRST203" && /Could not choose the best candidate function/i.test(msg);

    if (!ambiguous) throw e;

    const retryArgs = ctx.compactRecord({
      ...(baseArgs as any),
      p_co_code: (baseArgs as any).p_co_code ?? null,
      p_role: (baseArgs as any).p_role ?? null,
    });

    const data = await ctx.rpcWrite<any>("public", "person_upsert", retryArgs as any);
    return (data as any) ?? null;
  }
}

export async function personUpsertWithGrants(
  ctx: ApiModuleCtx,
  input: {
    person_id: string;
    full_name?: string | null;
    emails?: string | null;
    mobile?: string | null;
    fuse_emp_id?: string | null;
    person_notes?: string | null;
    person_nt_login?: string | null;
    person_csg_id?: string | null;
    active?: boolean | null;
    role?: string | null;
    co_ref_id?: string | null;
    co_code?: string | null;
  }
): Promise<PersonRow | null> {
  try {
    return await personUpsert(ctx, input);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const code = String(e?.code ?? "");
    const looksLikeRls =
      code === "42501" || /row-level security/i.test(msg) || /violates row-level security/i.test(msg);

    if (!looksLikeRls) throw e;

    const res = await fetch("/api/org/person-upsert", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || !json?.ok) {
      throw new Error(String(json?.error ?? msg ?? `Person save blocked (${res.status})`));
    }

    return (json.person as any) ?? null;
  }
}