"use client";

import type { ChangeEvent } from "react";
import { TextInput } from "@/components/ui/TextInput";

export type RegionDraft = {
  region_name: string;
  region_code: string;
};

export function RegionForm(props: {
  value: RegionDraft;
  onChange: (next: RegionDraft) => void;
}) {
  const { value, onChange } = props;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <div className="text-sm font-medium">Region name</div>
        <TextInput
          value={value.region_name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, region_name: e.target.value })}
          placeholder="e.g., Keystone"
        />
      </div>

      <div className="grid gap-1">
        <div className="text-sm font-medium">Region code</div>
        <TextInput
          value={value.region_code}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, region_code: e.target.value })}
          placeholder="e.g., KSR"
        />
      </div>

      <div className="text-xs text-[var(--to-ink-muted)]">
        Note: <span className="font-mono">region_id</span> (UUID) is system-owned and cannot be edited.
      </div>
    </div>
  );
}