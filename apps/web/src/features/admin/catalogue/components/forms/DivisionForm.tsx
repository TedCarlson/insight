"use client";

import type { Dispatch, SetStateAction } from "react";
import { TextInput } from "@/components/ui/TextInput";

export type DivisionDraft = {
  division_name: string;
  division_code: string;
};

export function DivisionForm(props: {
  value: DivisionDraft;
  onChange: Dispatch<SetStateAction<DivisionDraft | null>> | ((next: DivisionDraft) => void);
}) {
  const v = props.value;

  const set = (next: DivisionDraft) => {
    // support both setState and simple callback
    (props.onChange as any)(next);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Division name</label>
        <TextInput
          value={v.division_name}
          onChange={(e: any) => set({ ...v, division_name: String(e.target.value) })}
          placeholder="Northeast"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Division code</label>
        <TextInput
          value={v.division_code}
          onChange={(e: any) => set({ ...v, division_code: String(e.target.value).toUpperCase() })}
          placeholder="NEDIV"
        />
        <div className="text-xs text-[var(--to-ink-muted)]">Tip: code is usually uppercase.</div>
      </div>

      <div className="text-xs text-[var(--to-ink-muted)]">
        Note: <span className="font-mono">division_id</span> (UUID) is system-owned and cannot be edited.
      </div>
    </div>
  );
}