"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";

export type TabKey = "person" | "org" | "assignment" | "leadership" | "invite";

export function formatJson(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function hasOwn(obj: any, key: string) {
  return obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key);
}

export function KVRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-12 gap-2 text-sm">
      <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
      <div className="col-span-8 break-words">{value ?? "—"}</div>
    </div>
  );
}

export function CollapsibleJson({ obj, label }: { obj: any; label: string }) {
  return (
    <Card>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">{label}</summary>
        <pre
          className="mt-2 max-h-[360px] overflow-auto rounded border p-3 text-xs"
          style={{ borderColor: "var(--to-border)" }}
        >
          {formatJson(obj)}
        </pre>
      </details>
    </Card>
  );
}

export function AllFieldsCard({ title, obj, emptyHint }: { title: string; obj: any; emptyHint?: string }) {
  const rows = useMemo(() => {
    if (!obj) return [];
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    return keys.map((k) => ({ k, v: (obj as any)[k] }));
  }, [obj]);

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {!obj ? (
        <div className="text-sm text-[var(--to-ink-muted)]">{emptyHint ?? "No data."}</div>
      ) : rows.length ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <KVRow key={r.k} label={r.k} value={r.v} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-[var(--to-ink-muted)]">No fields.</div>
      )}
    </Card>
  );
}

export function buildTitle(row: any) {
  if (!row) return "Roster Row";

  const name =
    (hasOwn(row, "person_name") && (row as any).person_name) ||
    (hasOwn(row, "full_name") && (row as any).full_name) ||
    (hasOwn(row, "display_name") && (row as any).display_name) ||
    null;

  const assignment =
    (hasOwn(row, "assignment_name") && (row as any).assignment_name) ||
    (hasOwn(row, "role") && (row as any).role) ||
    null;

  if (name && assignment) return `${name} — ${assignment}`;
  if (name) return String(name);
  if (assignment) return String(assignment);
  return "Roster Row";
}

export function rowFallbackFullName(row: any): string | null {
  return (row && (row.full_name ?? row.person_name ?? row.display_name)) ?? null;
}

export function seedPersonFromRow(row: any): any | null {
  if (!row) return null;
  const person_id = row.person_id ?? row.personId ?? null;
  if (!person_id) return null;

  return {
    person_id,
    full_name: rowFallbackFullName(row),
    emails: row.emails ?? null,
    mobile: row.mobile ?? null,
    fuse_emp_id: row.fuse_emp_id ?? null,
    person_notes: row.person_notes ?? null,
    person_nt_login: row.person_nt_login ?? null,
    person_csg_id: row.person_csg_id ?? null,
    active: row.active ?? row.person_active ?? null,
    role: row.role ?? null,
    co_code: row.co_code ?? null,
    co_ref_id: row.co_ref_id ?? null,
  };
}

export function ensurePersonIdentity(obj: any, row: any): any {
  const next: any = { ...(obj ?? {}) };

  const pid = next.person_id ?? row?.person_id ?? null;
  if (pid && !next.person_id) next.person_id = pid;

  const fn = next.full_name ?? rowFallbackFullName(row);
  if (fn && (next.full_name == null || next.full_name === "")) next.full_name = fn;

  return next;
}