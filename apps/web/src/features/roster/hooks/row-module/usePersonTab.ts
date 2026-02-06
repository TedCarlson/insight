"use client";

import { useEffect, useState, useMemo } from "react";
import { api, type PersonRow } from "@/shared/lib/api";

import {
  seedPersonFromRow,
  ensurePersonIdentity,
  rowFallbackFullName,
} from "../../components/rosterRowModule.helpers";

type CoResolved = {
  kind: "company" | "contractor";
  name: string;
  matched_on: "id" | "code";
} | null;

export function usePersonTab(args: {
  open: boolean;
  tab: "person" | string;
  row: any;
  personId: string | null;
}) {
  const { open, tab, row, personId } = args;

  // NOTE:
  // This hook is designed to be used under a parent that remounts the row-module
  // when `open`/`row` changes. That removes the need for "reset state in effects"
  // (which triggers the React lint rule you're seeing).

  function seed(): PersonRow | null {
    if (!open) return null;
    const seeded = ensurePersonIdentity(seedPersonFromRow(row), row);
    return seeded?.person_id ? seeded : null;
  }

  const [person, setPerson] = useState<PersonRow | null>(() => seed());
  const [personErr, setPersonErr] = useState<string | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);

  const [editingPerson, setEditingPerson] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);

  const [personBaseline, setPersonBaseline] = useState<any | null>(() => {
    const s = seed();
    return s ? { ...(s as any) } : null;
  });

  const [personDraft, setPersonDraft] = useState<any | null>(() => {
    const s = seed();
    return s ? { ...(s as any) } : null;
  });

  const [coResolved, setCoResolved] = useState<CoResolved>(null);

  const personHuman = useMemo(() => {
    if (!person) return null;
    const base: any = { ...(person as any) };

    if (coResolved?.name) {
      // UI display only (your code uses this field as a display slot)
      base.co_ref_id = coResolved.name;
    }

    return base;
  }, [person, coResolved]);

  async function resolveCoDisplay(from: any) {
    try {
      const resolved = await api.resolveCoDisplay({
        co_ref_id: from?.co_ref_id ?? null,
        co_code: from?.co_code ?? null,
      });
      setCoResolved(resolved);
    } catch {
      setCoResolved(null);
    }
  }

  async function loadPerson() {
    if (!personId) return;

    setLoadingPerson(true);
    setPersonErr(null);

    try {
      const fetched = await api.personGet(String(personId));

      const merged = ensurePersonIdentity(fetched, row);
      setPerson(merged);
      setPersonBaseline({ ...(merged as any) });
      setPersonDraft({ ...(merged as any) });

      await resolveCoDisplay(merged);
    } catch (e: any) {
      setPersonErr(e?.message ?? "Failed to load person");
    } finally {
      setLoadingPerson(false);
    }
  }

  function beginEditPerson() {
    if (!person) return;
    const merged = ensurePersonIdentity(person, row);
    setEditingPerson(true);
    setPersonBaseline({ ...(merged as any) });
    setPersonDraft({ ...(merged as any) });
  }

  function cancelEditPerson() {
    setEditingPerson(false);
    setPersonDraft(
      personBaseline ? { ...personBaseline } : person ? { ...(person as any) } : null
    );
  }

  async function savePerson() {
    if (!personId || !personBaseline || !personDraft) {
      setEditingPerson(false);
      return;
    }

    const editableKeys = [
      "full_name",
      "emails",
      "mobile",
      "fuse_emp_id",
      "person_notes",
      "person_nt_login",
      "person_csg_id",
      "active",
      "co_ref_id",
      "co_code",
      "role",
    ] as const;

    const patch: any = { person_id: String(personId) };

    const fallbackName =
      (personBaseline as any)?.full_name ??
      (personDraft as any)?.full_name ??
      rowFallbackFullName(row);

    if (!fallbackName || String(fallbackName).trim() === "") {
      setPersonErr("Full name is required.");
      return;
    }

    for (const k of editableKeys) {
      const before = (personBaseline as any)[k];
      const after = (personDraft as any)[k];

      const isBool = k === "active";
      const normBefore = isBool ? Boolean(before) : before ?? null;
      const normAfter = isBool ? Boolean(after) : after ?? null;

      if (normAfter !== normBefore) patch[k] = normAfter;
    }

    if (Object.keys(patch).length === 1) {
      setEditingPerson(false);
      return;
    }

    if (!patch.full_name) patch.full_name = fallbackName;

    setSavingPerson(true);
    setPersonErr(null);

    try {
      const updated = await api.personUpsertWithGrants(patch);
      setEditingPerson(false);

      if (updated) {
        setPerson(updated);
        setPersonBaseline({ ...(updated as any) });
        setPersonDraft({ ...(updated as any) });
        await resolveCoDisplay(updated);
      } else {
        // Fallback: re-fetch if RPC didn't return the updated row
        await loadPerson();
      }
    } catch (e: any) {
      setPersonErr(e?.message ?? "Failed to save person");
    } finally {
      setSavingPerson(false);
    }
  }

  /**
   * Lazy-load when the tab becomes active.
   * IMPORTANT: Avoid calling setState synchronously inside the effect body.
   * We schedule the load on a 0ms timeout so state updates occur outside the effect callback.
   */
  useEffect(() => {
    if (!open) return;
    if (tab !== "person") return;
    if (!personId) return;

    const t = window.setTimeout(() => {
      void loadPerson();
    }, 0);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, personId]);

  return {
    person,
    personHuman,
    personErr,
    loadingPerson,

    editingPerson,
    savingPerson,
    personBaseline,
    personDraft,
    coResolved,

    setPersonDraft,
    setCoResolved,

    loadPerson,
    beginEditPerson,
    cancelEditPerson,
    savePerson,
  };
}