// apps/web/src/features/roster/add-to-roster/lib/personSearchFormat.ts

import type { PersonHit } from "@/features/roster/add-to-roster/hooks/usePersonSearch";

export function formatPersonTitle(p: PersonHit): string {
  const name = String(p.full_name ?? "").trim();
  const email = String(p.emails ?? "").split(",")[0]?.trim();
  if (name) return name;
  if (email) return email;
  return "Unnamed person";
}

export function formatPersonSubtitle(p: PersonHit): string {
  const parts: string[] = [];

  const emails = String(p.emails ?? "").trim();
  const mobile = String(p.mobile ?? "").trim();
  const nt = String(p.person_nt_login ?? "").trim();
  const csg = String(p.person_csg_id ?? "").trim();
  const fuse = String(p.fuse_emp_id ?? "").trim();

  if (emails) parts.push(emails);
  if (mobile) parts.push(mobile);
  if (nt) parts.push(`NT: ${nt}`);
  if (csg) parts.push(`CSG: ${csg}`);
  if (fuse) parts.push(`Fuse: ${fuse}`);

  return parts.join(" • ");
}

export function markMatches(text: string, q: string): Array<{ text: string; hit: boolean }> {
  const query = String(q ?? "").trim().toLowerCase();
  const src = String(text ?? "");
  if (!query || query.length < 2) return [{ text: src, hit: false }];

  const lower = src.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx < 0) return [{ text: src, hit: false }];

  return [
    { text: src.slice(0, idx), hit: false },
    { text: src.slice(idx, idx + query.length), hit: true },
    { text: src.slice(idx + query.length), hit: false },
  ];
}