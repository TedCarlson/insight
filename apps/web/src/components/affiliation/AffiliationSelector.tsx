// apps/web/src/components/affiliation/AffiliationSelector.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/shared/data/supabase/client";

import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Notice } from "@/components/ui/Notice";

export type AffiliationOption = {
  kind: "company" | "contractor";
  co_ref_id: string; // company_id or contractor_id
  co_code: string | null; // company_code or contractor_code
  name: string; // company_name or contractor_name
};

function toOptionLabel(o: AffiliationOption) {
  // Dropdown: show name (preferred) and code when available.
  return o.co_code ? `${o.name} • ${o.co_code}` : o.name;
}

function toSelectedLabel(o: AffiliationOption) {
  // Subtitle: show code + name when code exists (as requested).
  return o.co_code ? `${o.co_code} • ${o.name}` : o.name;
}

async function searchAffiliations(supabase: SupabaseClient, q: string, limit: number): Promise<AffiliationOption[]> {
  const query = (q ?? "").trim();
  const lim = Math.max(5, Math.min(limit ?? 25, 50));

  // When empty, return a small default list (alphabetical) from both sources.
  const companyBase = supabase
    .from("company_admin_v")
    .select("company_id, company_code, company_name")
    .order("company_name", { ascending: true })
    .limit(lim);

  const contractorBase = supabase
    .from("contractor_admin_v")
    .select("contractor_id, contractor_code, contractor_name")
    .order("contractor_name", { ascending: true })
    .limit(lim);

  const companyReq =
    query.length === 0
      ? companyBase
      : supabase
          .from("company_admin_v")
          .select("company_id, company_code, company_name")
          .or(`company_name.ilike.%${query}%,company_code.ilike.%${query}%`)
          .order("company_name", { ascending: true })
          .limit(lim);

  const contractorReq =
    query.length === 0
      ? contractorBase
      : supabase
          .from("contractor_admin_v")
          .select("contractor_id, contractor_code, contractor_name")
          .or(`contractor_name.ilike.%${query}%,contractor_code.ilike.%${query}%`)
          .order("contractor_name", { ascending: true })
          .limit(lim);

  const [companies, contractors] = await Promise.all([companyReq, contractorReq]);

  const out: AffiliationOption[] = [];

  if (!companies.error && Array.isArray(companies.data)) {
    for (const r of companies.data as any[]) {
      if (!r?.company_id || !r?.company_name) continue;
      out.push({
        kind: "company",
        co_ref_id: String(r.company_id),
        co_code: r.company_code ? String(r.company_code) : null,
        name: String(r.company_name),
      });
    }
  }

  if (!contractors.error && Array.isArray(contractors.data)) {
    for (const r of contractors.data as any[]) {
      if (!r?.contractor_id || !r?.contractor_name) continue;
      out.push({
        kind: "contractor",
        co_ref_id: String(r.contractor_id),
        co_code: r.contractor_code ? String(r.contractor_code) : null,
        name: String(r.contractor_name),
      });
    }
  }

  // Sort to keep stable results across combined lists.
  out.sort((a, b) => {
    const ak = `${a.kind}:${a.name}`.toLowerCase();
    const bk = `${b.kind}:${b.name}`.toLowerCase();
    return ak.localeCompare(bk);
  });

  return out;
}

export function AffiliationSelector(props: {
  value: AffiliationOption | null;
  onChange: (next: AffiliationOption | null) => void;

  label?: string;
  required?: boolean;

  limit?: number;
  help?: string;
}) {
  const { value, onChange, label = "Organization", required = false, limit = 25, help } = props;

  const supabase = useMemo(() => createClient() as unknown as SupabaseClient, []);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<AffiliationOption[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // Selected key for native <select>
  const selectedKey = value ? `${value.kind}:${value.co_ref_id}` : "";


  // For display: prefer the fully-hydrated option from the loaded list (so we can show name/code),
  // even if the parent only stored ids/codes.
  const displayValue = value
    ? opts.find((o) => o.kind === value.kind && o.co_ref_id === value.co_ref_id) ?? value
    : null;

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await searchAffiliations(supabase, q, limit);
        setOpts(res);
      } catch (e: any) {
        setOpts([]);
        setErr(e?.message ?? "Failed to load organizations");
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [supabase, q, limit]);

  function handleSelect(nextKey: string) {
    if (!nextKey) {
      onChange(null);
      return;
    }
    const hit = opts.find((o) => `${o.kind}:${o.co_ref_id}` === nextKey);
    onChange(hit ?? null);
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-medium">
        {label}
        {required ? " (required)" : ""}
      </div>

      {help ? (
        <Notice variant="info" title="Note">
          {help}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Search">
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to filter (name or code)…" />
        </Field>

        <Field label={loading ? "Loading…" : "Select"}>
          <Select value={selectedKey} onChange={(e) => handleSelect(e.target.value)}>
            <option value="">{required ? "Select an organization…" : "None"}</option>
            {opts.map((o) => (
              <option key={`${o.kind}:${o.co_ref_id}`} value={`${o.kind}:${o.co_ref_id}`}>
                {toOptionLabel(o)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {err ? (
        <Notice variant="warning" title="Org list">
          {err}
        </Notice>
      ) : null}

      {displayValue ? (
        <div className="text-xs text-[var(--to-ink-muted)]">Selected: {toSelectedLabel(displayValue)}</div>
      ) : null}
    </Card>
  );
}
