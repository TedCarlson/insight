// apps/web/src/app/(prod)/person/person.types.ts

/**
 * Authoritative admin row shape
 * Mirrors public.person_admin_v
 * All fields explicitly typed
 * No inferred or UI-only fields
 */

export interface PersonRow {
  /* ---------------- Identity ---------------- */
  person_id: string

  /* ---------------- Primary Admin Fields ---------------- */
  full_name: string | null
  emails: string | null
  mobile: string | null
  person_notes: string | null

  /* ---------------- Org / Employer ---------------- */
  co_ref_id: string | null
  co_code: string | null

  /* ---------------- Status / Role ---------------- */
  active: boolean | null
  role: string | null

  /* ---------------- Program / System IDs ---------------- */
  fuse_emp_id: string | null
  person_nt_login: string | null
  person_csg_id: string | null
}
