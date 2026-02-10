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

function norm(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function newUUID(): string {
  // Browser-safe UUID
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Ultra-rare fallback; should not hit in modern browsers
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/**
 * Only treat true "missing function" / schema-cache errors as fallback-safe.
 * Do NOT fallback on SQL errors (ambiguous column, permission denied, etc.).
 */
function isFnMissingError(msg: string) {
  const m = String(msg ?? "");
  return (
    /could not find the function/i.test(m) ||
    /does not exist/i.test(m) ||
    /schema cache/i.test(m) ||
    /not found/i.test(m) ||
    /missing in schema/i.test(m)
  );
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
      if (!res.ok) throw new Error((json as any)?.error ?? (json as any)?.message ?? `RPC failed: ${fn}`);
      return (json as any)?.data ?? null;
    },
    [supabase]
  );

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
          supabase.from("contractor").select("contractor_id, contractor_name, contractor_code").order("contractor_name").limit(500),
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
   * Upsert person (public) -> REQUIRES p_person_id even for inserts (DB rule)
   * add_to_roster (api preferred)
   * assignment_start optional (api preferred)
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
      const emails = String(draft.emails ?? "").trim();
      const co_ref_id = norm(draft.co_ref_id);

      if (!full_name) return { ok: false, error: "Full name is required." };
      if (!emails) return { ok: false, error: "Emails is required." };
      if (!co_ref_id) return { ok: false, error: "Affiliation is required." };
      if (!pcOrgId) return { ok: false, error: "Missing pc_org_id." };

      setSaving(true);
      try {
        let co_code = norm(draft.co_code);

        if (!co_code) {
          const opts = await ensureCoOptions();
          const hit = opts.find((o) => String(o.co_ref_id) === String(co_ref_id)) ?? null;
          co_code = hit?.co_code ?? null;
        }

        // ✅ DB requires explicit person_id for inserts
        const personId = norm(draft.person_id) ?? newUUID();

        // 1) Upsert person (PUBLIC)
        await callRpc(
          "person_upsert",
          {
            p_person_id: personId,
            p_full_name: full_name,
            p_emails: emails,
            p_mobile: norm(draft.mobile),
            p_fuse_emp_id: norm(draft.fuse_emp_id),
            p_person_notes: norm(draft.person_notes),
            p_person_nt_login: norm(draft.person_nt_login),
            p_person_csg_id: norm(draft.person_csg_id),
            p_active: typeof draft.active === "boolean" ? draft.active : true,
            p_role: null,
            p_co_ref_id: co_ref_id,
            p_co_code: co_code,
          },
          "public"
        );

        const startDate = todayISODate();

        // 2) Start membership (prefer API p_* args; fallback to PUBLIC non-p args if api function missing)
        await callRpcPreferApi(
          "add_to_roster",
          { p_pc_org_id: pcOrgId, p_person_id: personId, p_start_date: startDate },
          { pc_org_id: pcOrgId, person_id: personId, start_date: startDate }
        );

        // 3) Optional: Start assignment (prefer API p_* args; fallback to PUBLIC non-p args if api missing)
        if (startAssignment) {
          const pos = norm(positionTitle) ?? "Technician";

          await callRpcPreferApi(
            "assignment_start",
            {
              p_pc_org_id: pcOrgId,
              p_person_id: personId,
              p_position_title: pos,
              p_start_date: startDate,
              p_office_id: null,
            },
            {
              pc_org_id: pcOrgId,
              person_id: personId,
              position_title: pos,
              start_date: startDate,
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