// apps/web/src/features/roster/add-to-roster/components/PersonSearch.tsx
"use client";

import { TextInput } from "@/components/ui/TextInput";

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

export function PersonSearch({ value, onChange, disabled }: Props) {
  return (
    <div className="grid gap-2">
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search (name, emails, mobile, fuse, nt, csg)…"
        className="h-10"
        disabled={disabled}
      />
      <div className="text-xs text-[var(--to-ink-muted)]">
        Start typing (2+ chars). Empty search = no results.
      </div>
    </div>
  );
}