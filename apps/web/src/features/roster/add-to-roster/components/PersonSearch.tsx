// apps/web/src/features/roster/add-to-roster/components/PersonSearch.tsx
"use client";

import { useMemo } from "react";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

import { usePersonSearch } from "@/features/roster/add-to-roster/hooks/usePersonSearch";
import {
  formatPersonName,
  formatPersonOptionLabel,
  type PersonSearchRow,
} from "@/features/roster/add-to-roster/lib/personSearchFormat";

type Props = {
  value: string | null;
  onChange: (person: PersonSearchRow | null) => void;
  disabled?: boolean;

  // optional: to prevent adding someone already active in roster
  excludePersonIds?: Set<string>;
};

export function PersonSearch({ value, onChange, disabled, excludePersonIds }: Props) {
  const { q, setQ, loading, error, results, clear } = usePersonSearch({ limit: 25 });

  const filtered = useMemo(() => {
    const ex = excludePersonIds;
    if (!ex || ex.size === 0) return results;
    return results.filter((r) => !ex.has(String(r.person_id)));
  }, [results, excludePersonIds]);

  const selected = useMemo(() => {
    const id = String(value ?? "").trim();
    if (!id) return null;
    return filtered.find((r) => String(r.person_id) === id) ?? null;
  }, [value, filtered]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search person (name, tech id, email, mobile, NT login, CSG)…"
          className="h-10 w-full"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-10 px-3 text-xs"
          onClick={() => {
            clear();
            onChange(null);
          }}
          disabled={disabled && !q}
          title="Clear search"
        >
          Clear
        </Button>
      </div>

      {error ? (
        <Notice variant="danger" title="Search failed">
          <div className="text-sm">{error}</div>
        </Notice>
      ) : null}

      {!q.trim() ? (
        <EmptyState
          title="Search for a person"
          message="Start typing a name, tech id, email, mobile, NT login, or CSG."
          compact
        />
      ) : loading ? (
        <div className="text-sm text-[var(--to-ink-muted)]">Searching…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" message="Try a different search." compact />
      ) : (
        <div className="grid gap-1">
          <div className="text-xs text-[var(--to-ink-muted)]">Matches</div>
          <Select
            value={value ?? ""}
            onChange={(e) => {
              const id = String(e.target.value || "").trim();
              const row = filtered.find((r) => String(r.person_id) === id) ?? null;
              onChange(row);
            }}
            className="h-10 w-full"
            disabled={disabled}
          >
            <option value="" disabled>
              Select a person…
            </option>
            {filtered.map((p) => (
              <option key={p.person_id} value={p.person_id}>
                {formatPersonOptionLabel(p)}
              </option>
            ))}
          </Select>

          {selected ? (
            <div className="text-xs text-[var(--to-ink-muted)]">
              Selected: <span className="text-[var(--to-ink)]">{formatPersonName(selected)}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}