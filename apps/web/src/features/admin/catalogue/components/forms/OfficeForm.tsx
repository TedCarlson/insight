"use client";

import { TextInput } from "@/components/ui/TextInput";
import type { OfficeDraft } from "@/features/admin/catalogue/hooks/useOfficeAdmin";

export function OfficeForm(props: { value: OfficeDraft; onChange: (next: OfficeDraft) => void }) {
  const { value, onChange } = props;

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <div className="text-sm font-medium">Office name</div>
        <TextInput
          value={value.office_name}
          onChange={(e: any) => onChange({ ...value, office_name: String(e.target.value) })}
          placeholder="Ex: Pittsburgh"
        />
        <div className="text-xs text-[var(--to-ink-muted)]">Required</div>
      </div>

      <div className="grid gap-1">
        <div className="text-sm font-medium">Sub-region</div>
        <TextInput
          value={value.sub_region}
          onChange={(e: any) => onChange({ ...value, sub_region: String(e.target.value) })}
          placeholder="Ex: Keystone West"
        />
      </div>

      <div className="grid gap-1">
        <div className="text-sm font-medium">Address</div>
        <TextInput
          value={value.address}
          onChange={(e: any) => onChange({ ...value, address: String(e.target.value) })}
          placeholder="Optional"
        />
      </div>
    </div>
  );
}