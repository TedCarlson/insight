# Insight — Operations Intelligence

_Last updated: 2026-02-02_

## Synopsis
Insight is a lightweight operations intelligence app that unifies roster management, resource planning, and performance visibility.

It creates a single, time-aware view of who is working where, under whom, and in what role — across companies, regions, territories, offices, and supervisors. That structure becomes the foundation for accurate KPI assignment, trend analysis, and reporting.

## What this app solves (current focus)
1. **Roster management (ops-first):** Manage operational rosters outside HR/Payroll constraints.
2. **Scheduling + planning:** Prepare schedules to meet customer demand efficiently, with forecasting and efficiency auditing.
3. **KPI + metrics visibility:** Drill from technician-level performance up through leaders, teams, and exec-level rollups.

> Parking-lot: additional “up-reporting” features that standardize reporting beyond the three pillars above.

---

## Architecture at a glance
- **Frontend:** Next.js (App Router) + Tailwind + UI primitives (shadcn-style)
- **Auth + Data:** Supabase (Postgres + RLS) using `@supabase/ssr`
- **Security model:** Middleware guards + RLS + org/permission RPC gates

### Key runtime concepts
- **Auth user**: Supabase Auth identity.
- **User profile**: `public.user_profile` (status + selected org).
- **Org context**: `public.pc_org` + selection stored on the profile; used to scope almost all reads/writes.
- **Permissions**: edge-grants stored in `public.pc_org_permission_grant`, defined by `public.permission_def`.
- **Roster graph**:
  - `public.person` (individual)
  - `public.person_pc_org` (membership in an org)
  - `public.assignment` (who reports to whom / what role / what location)
  - `public.assignment_reporting` (derived reporting relationships)

**Note on `tech_id`:** `public.assignment.tech_id` is a **text** field used as a third‑party technician identifier (customer-assigned), pulled in for reporting. It is *not* a UUID.

---

## Repository layout (high level)
- `apps/web/` — Next.js app
- `supabase/` — SQL, migrations, policies, and RPC definitions
- `scripts/` — helper scripts
- `.github/` — CI / repo automation

---

## Routing + access control
### Global guard (Next middleware)
File: `apps/web/middleware.ts`

Rules:
- Public UI routes: `/`, `/login*`, `/auth*`, `/access*`, `/favicon.ico`
- Public API routes: `/api/auth/*`
- Everything else requires a valid session
- Non-owner users must have `user_profile.status = 'active'` or they get:
  - UI redirect → `/access`
  - API response → `403`

### UI routes currently present
Generated from `apps/web/src/app/**/page.tsx` (route groups stripped):

- `/`
- `/access`
- `/admin`
- `/admin/edge-permissions`
- `/admin/leadership`
- `/admin/org-users`
- `/auth/set-password`
- `/auth/signout`
- `/dev/kit`
- `/home`
- `/login`
- `/login/reset`
- `/metrics`
- `/onboard`
- `/roster`
- `/route-lock`
- `/route-lock/quota`
- `/route-lock/routes`
- `/route-lock/schedule`
- `/route-lock/shift-validation`

### API routes currently present
Generated from `apps/web/src/app/api/**/route.ts`:

- `/api/admin`
- `/api/admin/invite`
- `/api/admin/leader-lookup`
- `/api/admin/org-people-inventory`
- `/api/admin/org-users`
- `/api/auth/bootstrap`
- `/api/auth/recovery`
- `/api/auth/signout`
- `/api/meta/position-titles`
- `/api/org/assignment`
- `/api/org/reporting-chain`
- `/api/org/roster-header`
- `/api/org/rpc`
- `/api/people-inventory`
- `/api/profile/select-org`
- `/api/route-lock/quota`
- `/api/route-lock/quota/list`
- `/api/route-lock/quota/lookups`
- `/api/route-lock/quota/upsert`
- `/api/route-lock/routes/delete`
- `/api/route-lock/routes/list`
- `/api/route-lock/routes/upsert`
- `/api/route-lock/schedule/upsert`
- `/api/session/status`
- `/auth/callback`


> There is also an auth callback route handler at `/auth/callback` (`apps/web/src/app/auth/callback/route.ts`).

---

## Backend patterns
### “Privileged write gateway” (`/api/org/rpc`)
File: `apps/web/src/app/api/org/rpc/route.ts`

Purpose:
- Central server-side route that **allowlists specific DB RPC functions**
- Enforces:
  - authenticated user
  - selected org
  - org-access check(s)
  - permission checks for sensitive writes

This is the preferred pattern for complex writes where direct table DML would be hard to secure purely with RLS.

### Direct route-handler writes
Some route handlers use the Supabase **service role** server-side (see `apps/web/src/lib/supabase/admin.ts`). These should be:
- tightly scoped
- guarded by explicit org/permission checks
- never callable without auth (middleware covers most, but route handlers must still validate)

---

## Database overview
Supabase exports in this repo include:
- **35 tables** in `public`
- **33 public views**

Key tables/views you’ll touch frequently:
- `public.user_profile`
- `public.pc_org`
- `public.person`, `public.person_pc_org`
- `public.assignment`, `public.assignment_reporting`
- `public.permission_def`, `public.pc_org_permission_grant`
- `public.org_event` and `public.org_event_feed_v`

---

## Getting started (local)
### Prereqs
- Node + pnpm (repo uses `pnpm-workspace.yaml`)
- A Supabase project (local or hosted)

### Required environment variables (web app)
Used by:
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/supabase/admin.ts`

Minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to the browser)

### Common commands
- `pnpm install`
- `pnpm -C apps/web dev` (or whatever dev script is defined in `apps/web/package.json`)

> Add an `.env.local` under `apps/web/` for Next.js.

---

## Documentation workflow (how we keep this grounded)
- **This `README.md` is the single source of truth** for: product intent, architecture, routing/guards, and the current “how it works”.
- When you modify a module (roster, scheduling, metrics, admin, etc.), update **in the same PR**:
  1) the relevant code, and
  2) the relevant section in this README.
- If a topic grows too large for this README, extract a focused doc under `apps/web/docs/` and **link it from here** (but keep the canonical summary in this README).
- Historical plans / session notes should live in `apps/web/docs/archive/`.

## Documentation map
These files are **supplemental deep-dives**. If they ever conflict with this README, treat this README as canonical and then update the other doc to match.

- Routes catalog (historical; may drift): `apps/web/ROUTES_AND_GUARDS.md`
- Cleanup battle plan (status/history): `apps/web/CLEANUP_BATTLEPLAN_STATUS.md`
- API conventions and security model: `apps/web/src/app/api/README.md`
- Onboarding flow notes: `apps/web/src/app/onboard/README.md`
- UI primitives catalog: `apps/web/src/components/ui/README.md`
