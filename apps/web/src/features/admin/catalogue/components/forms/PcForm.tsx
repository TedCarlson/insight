"use client";

import { TextInput } from "@/components/ui/TextInput";
import type { PcDraft } from "@/features/admin/catalogue/hooks/usePcAdmin";

export function PcForm(props: { value: PcDraft; onChange: (next: PcDraft) => void }) {
  const { value, onChange } = props;

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <div className="text-sm font-medium">PC number</div>
        <TextInput
          inputMode="numeric"
          value={value.pc_number}
          onChange={(e: any) => onChange({ ...value, pc_number: String(e.target.value) })}
          placeholder="Ex: 427"
        />
        <div className="text-xs text-[var(--to-ink-muted)]">Required • integer</div>
      </div>
    </div>
  );
}