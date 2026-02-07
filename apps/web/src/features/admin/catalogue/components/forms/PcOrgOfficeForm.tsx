"use client";

import { useMemo } from "react";

export type LookupOption = {
  id: string;
  label: string;
  sublabel?: string;
};

export type PcOrgOfficeDraft = {
  pc_org_id: string | null;
  office_id: string | null;
};

function normalize(v: string) {
  const s = v.trim();
  return s.length ? s : "";
}

export function PcOrgOfficeForm(props: {
  value: PcOrgOfficeDraft;
  onChange: (next: PcOrgOfficeDraft) => void;

  pcOrgOptions: LookupOption[];
  officeOptions: LookupOption[];
}) {
  const pcOrgOptions = useMemo(
    () => [{ id: "", label: "Select PC-ORG…" }, ...props.pcOrgOptions],
    [props.pcOrgOptions]
  );

  const officeOptions = useMemo(
    () => [{ id: "", label: "Select Office…" }, ...props.officeOptions],
    [props.officeOptions]
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <div className="to-label">PC-ORG</div>
        <select
          className="to-select"
          value={props.value.pc_org_id ?? ""}
          onChange={(e) => {
            const id = normalize(e.target.value);
            props.onChange({ ...props.value, pc_org_id: id || null });
          }}
        >
          {pcOrgOptions.map((o) => (
            <option key={o.id || "__empty"} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <div className="to-label">Office</div>
        <select
          className="to-select"
          value={props.value.office_id ?? ""}
          onChange={(e) => {
            const id = normalize(e.target.value);
            props.onChange({ ...props.value, office_id: id || null });
          }}
        >
          {officeOptions.map((o) => (
            <option key={o.id || "__empty"} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs text-[var(--to-ink-muted)]">
        This table is a relationship link (PC-ORG ↔ Office). The UUID is system-owned.
      </div>
    </div>
  );
}