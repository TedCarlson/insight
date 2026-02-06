// apps/web/src/features/roster/add-to-roster/hooks/useAddToRoster.ts
"use client";

import { useState } from "react";

export type AddToRosterInput = {
  pcOrgId: string;
  personId: string;

  positionTitle: string;

  reportsToPersonId?: string | null;
  startDate?: string | null; // YYYY-MM-DD
  notes?: string | null;
};

export type UseAddToRosterState = {
  loading: boolean;
  error: string | null;
  add: (input: AddToRosterInput) => Promise<any>;
};

export function useAddToRoster(): UseAddToRosterState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(input: AddToRosterInput) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/org/assignment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          pc_org_id: input.pcOrgId,
          person_id: input.personId,
          position_title: input.positionTitle,
          reports_to_person_id: input.reportsToPersonId ?? null,
          start_date: input.startDate ?? null,
          notes: input.notes ?? null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Add to roster failed");

      return json?.data ?? json;
    } catch (e: any) {
      const msg = e?.message ?? "Add to roster failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, add };
}