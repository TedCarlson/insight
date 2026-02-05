"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PersonRow } from "@/lib/api";

import {
  seedPersonFromRow,
  ensurePersonIdentity,
  rowFallbackFullName,
} from "../../components/rosterRowModule.helpers";

export function usePersonTab(args: {
  open: boolean;
  tab: "person" | string;
  row: any;
  personId: string | null;
}) {
  const { open, tab, row, personId } = args;

  const [person, setPerson] = useState<PersonRow | null>(null);
  const [personErr, setPersonErr] = useState<string | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);

  const [editingPerson, setEditingPerson] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [personBaseline, setPersonBaseline] = useState<any | null>(null);
  const [personDraft, setPersonDraft] = useState<any | null>(null);

  const [coResolved, setCoResolved] = useState<{
    kind: "company" | "contractor";
    name: string;
    matched_on: "id" | "code";
  } | null>(null);

  const personHuman = useMemo(() => {
    if (!person) return null;
    const base: any = { ...(person as any) };

    if (coResolved?.name) {
      base.co_ref_id = coResolved.name;
    }

    return base;
  }, [person, coResolved]);

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

      try {
        const resolved = await api.resolveCoDisplay({
          co_ref_id: (merged as any)?.co_ref_id ?? null,
          co_code: (merged as any)?.co_code ?? null,
        });
        setCoResolved(resolved);
      } catch {
        setCoResolved(null);
      }
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

        try {
          const resolved = await api.resolveCoDisplay({
            co_ref_id: (updated as any)?.co_ref_id ?? null,
            co_code: (updated as any)?.co_code ?? null,
          });
          setCoResolved(resolved);
        } catch {
          setCoResolved(null);
        }
      } else {
        await loadPerson();
      }
    } catch (e: any) {
      setPersonErr(e?.message ?? "Failed to save person");
    } finally {
      setSavingPerson(false);
    }
  }

  // Seed/reset on open
  useEffect(() => {
    if (!open) return;

    const seeded = ensurePersonIdentity(seedPersonFromRow(row), row);

    setPerson(seeded?.person_id ? seeded : null);
    setPersonBaseline(seeded?.person_id ? { ...(seeded as any) } : null);
    setPersonDraft(seeded?.person_id ? { ...(seeded as any) } : null);

    setPersonErr(null);
    setLoadingPerson(false);
    setEditingPerson(false);
    setSavingPerson(false);
  }, [open, row]);

  // Lazy load
  useEffect(() => {
    if (!open) return;
    if (tab === "person") void loadPerson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

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