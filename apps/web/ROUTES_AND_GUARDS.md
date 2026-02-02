# Routes and Guards Catalog

> ⚠️ **Deprecated / may drift:** The authoritative route + guard documentation lives in `/README.md` under **Routing + access control**. This file is kept for historical reference.

Generated from `apps/web/src/app/**` (Next.js App Router).

## Legend
- **Type:** Page / API / Layout / Handler
- **Auth:** Public / Requires session / Dev-only
- **Status Gate:** None / Active required
- **Role Gate:** None / Owner / Permissioned / Org-scoped

## Global guard policy (middleware)

Source: `apps/web/middleware.ts`

- `/favicon.ico` is allowlisted to avoid auth redirects for browser icon requests (even if the file is not created yet).

- **Public UI:** `/`, `/login*`, `/access*`, `/auth*`, `/favicon.ico`
- **Public API:** `/api/auth/*` only
- Everything else requires a session
- Active-status gate for signed-in **non-owners**:
  - UI → redirect to `/access`
  - API → JSON `403`
- Owner bypass: `rpc("is_owner")`

## Pages

| Route | Type | Auth | Status Gate | Role Gate | Notes / Evidence |
|---|---|---|---|---|---|
| `/` | Page | Public | None | None | `apps/web/src/app/page.tsx` |
| `/login` | Page | Public | None | None | `apps/web/src/app/(public)/login/page.tsx` |
| `/login/reset` | Page | Public | None | None | `apps/web/src/app/(public)/login/reset/page.tsx` |
| `/access` | Page | Public (middleware) | Page-level enforcement | None | Redirects to `/login` if logged out; bootstraps profile. `apps/web/src/app/(public)/access/page.tsx` |
| `/auth/set-password` | Page | Public | None | None | `apps/web/src/app/auth/set-password/page.tsx` |
| `/auth/signout` | Page | Public | None | None | `apps/web/src/app/auth/signout/page.tsx` |
| `/home` | Page | Requires session | Active required | None | `apps/web/src/app/home/page.tsx` |
| `/onboard` | Page | Requires session | Active required | Org-scoped | `apps/web/src/app/onboard/page.tsx` |
| `/roster` | Page | Requires session | Active required | Org-scoped | `apps/web/src/app/roster/page.tsx` |
| `/admin/edge-permissions` | Page | Requires session | Active required | Permissioned (via API) | Calls `/api/admin/org-users` (permissioned). `apps/web/src/app/admin/edge-permissions/page.tsx` |
| `/dev/kit` | Page | Requires session + Dev-only (layout) | Active required | None | Layout redirects to `/` when `NODE_ENV !== "development"`. `apps/web/src/app/dev/kit/layout.tsx` |

## API

| Route | Type | Auth | Status Gate | Role Gate | Notes / Evidence |
|---|---|---|---|---|---|
| `/api/auth/bootstrap` | API | Public | None | None | `apps/web/src/app/api/auth/bootstrap/route.ts` |
| `/api/auth/recovery` | API | Public | None | None | `apps/web/src/app/api/auth/recovery/route.ts` |
| `/api/auth/signout` | API | Public | None | None | `apps/web/src/app/api/auth/signout/route.ts` |
| `/api/session/status` | API | Requires session | Active required | None | `apps/web/src/app/api/session/status/route.ts` |
| `/api/profile/select-org` | API | Requires session | Active required | None | `apps/web/src/app/api/profile/select-org/route.ts` |
| `/api/meta/position-titles` | API | Requires session | Active required | None | Uses service role read. `apps/web/src/app/api/meta/position-titles/route.ts` |
| `/api/org/assignment` | API | Requires session | Active required | Org-selected required | Uses `requireSelectedPcOrg...`. `apps/web/src/app/api/org/assignment/route.ts` |
| `/api/admin` | API | Requires session | Active required | Same as assignment | Back-compat wrapper exporting POST from `/api/org/assignment`. `apps/web/src/app/api/admin/route.ts` |
| `/api/admin/invite` | API | Requires session | Active required | Owner | GET returns 405; POST enforces `rpc("is_owner")`. `apps/web/src/app/api/admin/invite/route.ts` |
| `/api/admin/org-users` | API | Requires session | Active required | Permissioned | Enforces `api.can_manage_pc_org_console`. `apps/web/src/app/api/admin/org-users/route.ts` |

## Handlers

| Route | Type | Auth | Status Gate | Role Gate | Notes / Evidence |
|---|---|---|---|---|---|
| `/auth/callback` | Handler | Public | None | None | `apps/web/src/app/auth/callback/route.ts` |

## `/dev/kit` in prod
- In non-development environments, middleware redirects `/dev/kit*` → `/` before auth checks.
- `/` redirects to `/home` only when signed in; otherwise it renders a public landing.

