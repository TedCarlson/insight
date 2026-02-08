"use client";

import type { Dispatch, SetStateAction } from "react";
import { TextInput } from "@/components/ui/TextInput";

export type MsoDraft = {
  mso_name: string;
  mso_lob: "LOCATE" | "FULFILLMENT" | "";
};

const LOB_OPTIONS: Array<{ value: "LOCATE" | "FULFILLMENT"; label: string }> = [
  { value: "LOCATE", label: "LOCATE" },
  { value: "FULFILLMENT", label: "FULFILLMENT" },
];

export function MsoForm(props: {
  value: MsoDraft;
  onChange: Dispatch<SetStateAction<MsoDraft | null>> | ((next: MsoDraft) => void);
}) {
  const v = props.value;

  const set = (next: MsoDraft) => {
    (props.onChange as any)(next);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">MSO name</label>
        <TextInput
          value={v.mso_name}
          onChange={(e: any) => set({ ...v, mso_name: String(e.target.value) })}
          placeholder="Comcast - Fulfillment"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">LOB</label>

        <select
          value={v.mso_lob}
          onChange={(e) => set({ ...v, mso_lob: e.target.value as MsoDraft["mso_lob"] })}
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        >
          <option value="">Select LOB…</option>
          {LOB_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="text-xs text-[var(--to-ink-muted)]">
          LOB is a security/view fork — keep it controlled (no free-text).
        </div>
      </div>

      <div className="text-xs text-[var(--to-ink-muted)]">
        Note: <span className="font-mono">mso_id</span> (UUID) is system-owned and cannot be edited.
      </div>
    </div>
  );
}