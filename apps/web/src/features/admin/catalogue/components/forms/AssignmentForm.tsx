"use client";

import { TextInput } from "@/components/ui/TextInput";
import type { LookupOption } from "@/features/admin/catalogue/components/forms/PcOrgForm";

export type AssignmentDraft = {
  person_id: string | null;
  pc_org_id: string | null;

  office_id: string | null;
  position_title: string | null;

  tech_id: string | null;
  start_date: string; // required
  end_date: string | null;
  active: boolean;
};

export function AssignmentForm(props: {
  value: AssignmentDraft;
  onChange: (next: AssignmentDraft) => void;

  personOptions: LookupOption[];
  pcOrgOptions: LookupOption[];
  officeOptions: LookupOption[];
  positionTitleOptions: LookupOption[];
}) {
  const v = props.value;
  const set = (next: AssignmentDraft) => props.onChange(next);

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Person</label>
        <select
          value={v.person_id ?? ""}
          onChange={(e) => set({ ...v, person_id: e.target.value || null })}
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        >
          <option value="">Select person…</option>
          {props.personOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">PC-Org</label>
        <select
          value={v.pc_org_id ?? ""}
          onChange={(e) => set({ ...v, pc_org_id: e.target.value || null })}
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        >
          <option value="">Select PC-Org…</option>
          {props.pcOrgOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="text-xs text-[var(--to-ink-muted)]">Office choices are active-only.</div>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Office</label>
        <select
          value={v.office_id ?? ""}
          onChange={(e) => set({ ...v, office_id: e.target.value || null })}
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        >
          <option value="">(None)</option>
          {props.officeOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Position title</label>
        <select
          value={v.position_title ?? ""}
          onChange={(e) => set({ ...v, position_title: e.target.value || null })}
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        >
          <option value="">(None)</option>
          {props.positionTitleOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Tech ID</label>
        <TextInput
          value={v.tech_id ?? ""}
          onChange={(e: any) => set({ ...v, tech_id: String(e.target.value) || null })}
          placeholder="Optional"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Start date</label>
        <input
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
          type="date"
          value={v.start_date}
          onChange={(e) => set({ ...v, start_date: e.target.value })}
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">End date</label>
        <input
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
          type="date"
          value={v.end_date ?? ""}
          onChange={(e) => set({ ...v, end_date: e.target.value || null })}
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-[var(--to-ink-muted)]">Status</label>
        <select
          value={String(v.active)}
          onChange={(e) => set({ ...v, active: e.target.value === "true" })}
          className="h-10 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
    </div>
  );
}   