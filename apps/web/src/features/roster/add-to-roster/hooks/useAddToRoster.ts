// apps/web/src/features/roster/add-to-roster/hooks/useAddToRoster.ts
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createClient } from "@/shared/data/supabase/client";

export type CoOption = {
  co_ref_id: string;
  co_name: string;
  co_code: string | null;
  co_type: "company" | "contractor";
};

export type OnboardPersonDraft = {
  person_id: string | null;

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
  co_name?: string | null;
  co_type?: string | null;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type RpcSchema = "api" | "public";

function todayISODate(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isFnMissingError(msg: string) {
  return (
    /could not find the function/i.test(msg) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /not found/i.test(msg)
  );
}

function norm(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

/**
 * Extract person_id from a wide range of RPC return shapes.
 * Handles:
 * - uuid string
 * - { person_id } / { id }
 * - { data: { person_id } } / { data: [...] }
 * - [{ person_id }]
 */
function extractPersonId(rpcData: unknown, fallback: string | null): string | null {
  const fb = norm(fallback);
  if (!rpcData) return fb;

  if (typeof rpcData === "string") return norm(rpcData) ?? fb;

  if (Array.isArray(rpcData)) {
    const first: any = rpcData[0];
    return norm(first?.person_id ?? first?.id) ?? fb;
  }

  const o: any = rpcData as any;

  const direct = norm(o?.person_id ?? o?.id);

  const dataObj = o?.data;
  const nested =
    (Array.isArray(dataObj)
      ? norm((dataObj[0] as any)?.person_id ?? (dataObj[0] as any)?.id)
      : norm((dataObj as any)?.person_id ?? (dataObj as any)?.id)) ?? null;

  return direct ?? nested ?? fb;
}

function deriveRoleFromAffiliation(kind: "company" | "contractor" | null | undefined): string {
  // Per your rule set (no NULL allowed)
  return kind === "contractor" ? "Contractors" : "Hires";
}

export function useAddToRoster() {
  const supabase = useMemo(() => createClient(), []);

  const [saving, setSaving] = useState(false);

  const [coLoading, setCoLoading] = useState(false);
  const [coOptions, setCoOptions] = useState<CoOption[]>([]);

  const loadPromiseRef = useRef<Promise<CoOption[]> | null>(null);

  const callRpc = useCallback(
    async (fn: string, args: Record<string, any>, schema: RpcSchema): Promise<any> => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes?.session?.access_token ?? "";

      const res = await fetch("/api/org/rpc", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ schema, fn, args }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? `RPC failed: ${fn}`);
      return json?.data ?? null;
    },
    [supabase]
  );

  /**
   * Prefer api schema, fallback to public ONLY if the function is missing in api.
   * IMPORTANT: apiArgs and publicArgs can differ (they do in this project).
   */
  const callRpcPreferApi = useCallback(
    async (fn: string, apiArgs: Record<string, any>, publicArgs: Record<string, any>): Promise<any> => {
      try {
        return await callRpc(fn, apiArgs, "api");
      } catch (e: any) {
        const msg = String(e?.message ?? "");
        if (!isFnMissingError(msg)) throw e;
        return await callRpc(fn, publicArgs, "public");
      }
    },
    [callRpc]
  );

  const ensureCoOptions = useCallback(async (): Promise<CoOption[]> => {
    if (coOptions.length) return coOptions;
    if (loadPromiseRef.current) return loadPromiseRef.current;

    const p = (async () => {
      setCoLoading(true);
      try {
        const [{ data: companies, error: cErr }, { data: contractors, error: kErr }] = await Promise.all([
          supabase.from("company").select("company_id, company_name, company_code").order("company_name").limit(500),
          supabase
            .from("contractor")
            .select("contractor_id, contractor_name, contractor_code")
            .order("contractor_name")
            .limit(500),
        ]);

        if (cErr) throw cErr;
        if (kErr) throw kErr;

        const out: CoOption[] = [
          ...(companies ?? []).map((r: any) => ({
            co_ref_id: String(r.company_id),
            co_name: String(r.company_name),
            co_code: r.company_code ? String(r.company_code) : null,
            co_type: "company" as const,
          })),
          ...(contractors ?? []).map((r: any) => ({
            co_ref_id: String(r.contractor_id),
            co_name: String(r.contractor_name),
            co_code: r.contractor_code ? String(r.contractor_code) : null,
            co_type: "contractor" as const,
          })),
        ];

        out.sort((a, b) => {
          const aType = a.co_type === "company" ? 0 : 1;
          const bType = b.co_type === "company" ? 0 : 1;
          if (aType !== bType) return aType - bType;
          return a.co_name.localeCompare(b.co_name, undefined, { sensitivity: "base" });
        });

        setCoOptions(out);
        return out;
      } finally {
        setCoLoading(false);
        loadPromiseRef.current = null;
      }
    })();

    loadPromiseRef.current = p;
    return p;
  }, [coOptions, supabase]);

  /**
   * Upsert person (public), start membership (api.add_to_roster; public fallback),
   * then start assignment (api/public) using selected positionTitle.
   */
  const upsertAndAddMembership = useCallback(
    async (input: {
      pcOrgId: string;
      positionTitle: string;
      draft: OnboardPersonDraft;
      startAssignment?: boolean;
    }): Promise<Result<{ personId: string }>> => {
      const { pcOrgId, positionTitle, draft, startAssignment = true } = input;

      const full_name = String(draft.full_name ?? "").trim();
      const emailsRaw = String(draft.emails ?? "").trim();
      const emails = emailsRaw ? emailsRaw : null;

      const co_ref_id = draft.co_ref_id ? String(draft.co_ref_id).trim() : "";
      if (!full_name) return { ok: false, error: "Full name is required." };
      if (!co_ref_id) return { ok: false, error: "Affiliation is required." };
      if (!pcOrgId) return { ok: false, error: "Missing pc_org_id." };

      setSaving(true);
      try {
        let co_code = draft.co_code ? String(draft.co_code) : null;

        const opts = await ensureCoOptions();
        const hit = opts.find((o) => String(o.co_ref_id) === co_ref_id) ?? null;

        if (!co_code) co_code = hit?.co_code ?? null;

        // Role: NEVER NULL (per your rule). Prefer explicit draft.role, else derive.
        const derivedKind =
          (hit?.co_type as any) ??
          (String(draft.co_type ?? "").toLowerCase().includes("contract") ? "contractor" : "company");

        const role = norm(draft.role) ?? deriveRoleFromAffiliation(derivedKind);

        // 1) Upsert person (PUBLIC)
        const personRow = await callRpc(
          "person_upsert",
          {
            p_person_id: draft.person_id, // null = insert
            p_full_name: full_name,
            p_emails: emails, // ✅ email optional
            p_mobile: String(draft.mobile ?? "").trim() || null,
            p_fuse_emp_id: String(draft.fuse_emp_id ?? "").trim() || null,
            p_person_notes: String(draft.person_notes ?? "").trim() || null,
            p_person_nt_login: String(draft.person_nt_login ?? "").trim() || null,
            p_person_csg_id: String(draft.person_csg_id ?? "").trim() || null,
            p_active: typeof draft.active === "boolean" ? draft.active : true,
            p_role: role, // ✅ NEVER NULL
            p_co_ref_id: co_ref_id,
            p_co_code: co_code,
          },
          "public"
        );

        const personId = extractPersonId(personRow, draft.person_id);
        if (!personId) return { ok: false, error: "Upsert succeeded but no person_id was returned." };

        // 2) Start membership
        await callRpcPreferApi(
          "add_to_roster",
          {
            p_pc_org_id: pcOrgId,
            p_person_id: personId,
            p_start_date: todayISODate(),
          },
          {
            pc_org_id: pcOrgId,
            person_id: personId,
            start_date: todayISODate(),
          }
        );

        // 3) Optional: Start assignment
        if (startAssignment) {
          const pos = norm(positionTitle) ?? "Technician";

          await callRpcPreferApi(
            "assignment_start",
            {
              p_pc_org_id: pcOrgId,
              p_person_id: personId,
              p_position_title: pos,
              p_start_date: todayISODate(),
              p_office_id: null,
            },
            {
              pc_org_id: pcOrgId,
              person_id: personId,
              position_title: pos,
              start_date: todayISODate(),
            }
          );
        }

        return { ok: true, data: { personId } };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Add failed" };
      } finally {
        setSaving(false);
      }
    },
    [ensureCoOptions, callRpc, callRpcPreferApi]
  );

  return {
    saving,
    coLoading,
    coOptions,
    ensureCoOptions,
    upsertAndAddMembership,
  };
}

export type UseAddToRosterState = ReturnType<typeof useAddToRoster>;