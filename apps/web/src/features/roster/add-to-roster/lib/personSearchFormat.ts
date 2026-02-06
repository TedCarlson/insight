// apps/web/src/features/roster/add-to-roster/lib/personSearchFormat.ts

export type PersonSearchRow = {
  person_id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  tech_id?: string | null;
  person_nt_login?: string | null;
  person_csg_id?: string | null;
  co_name?: string | null;
  co_type?: string | null;
};

export function formatPersonName(p: PersonSearchRow): string {
  const name = String(p.full_name ?? p.name ?? "").trim();
  return name || "—";
}

export function formatPersonSubtitle(p: PersonSearchRow): string {
  const bits: string[] = [];

  const tech = String(p.tech_id ?? "").trim();
  if (tech) bits.push(`Tech ${tech}`);

  const email = String(p.email ?? "").trim();
  if (email) bits.push(email);

  const mobile = String(p.mobile ?? "").trim();
  if (mobile) bits.push(mobile);

  const nt = String(p.person_nt_login ?? "").trim();
  if (nt) bits.push(`NT ${nt}`);

  const csg = String(p.person_csg_id ?? "").trim();
  if (csg) bits.push(`CSG ${csg}`);

  const co = String(p.co_name ?? "").trim();
  if (co) bits.push(co);

  return bits.join(" • ");
}

export function formatPersonOptionLabel(p: PersonSearchRow): string {
  const name = formatPersonName(p);
  const sub = formatPersonSubtitle(p);
  return sub ? `${name} — ${sub}` : name;
}