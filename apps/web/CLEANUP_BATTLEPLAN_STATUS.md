# Cleanup Battle Plan Status

## Phase 1 — Auth redirect + signout integrity (COMPLETED)
- ✅ Hardened `next` handling to prevent login redirect loops.
- ✅ Implemented authoritative signout flow (client best-effort + server cookie clear).
- ✅ Verified private-route guarding works after signout.

## Phase 1.2 — Consolidate auth/org listeners (COMPLETED)
- ✅ Single SessionProvider auth listener.
- ✅ FooterHelp consumes session context (no auth subscription).
- ✅ OrgProvider consumes session context (no auth subscription).
- ✅ OrgSelector hardened (no undefined keys/values; clear empty/loading UX).

## Phase 3 — Routing & API drift cleanup

### Phase 3.1 — Fix assignment endpoint drift (COMPLETED)
- ✅ Created real endpoint: `apps/web/src/app/api/org/assignment/route.ts`
- ✅ `/api/admin` (root) wrapper forwards to `/api/org/assignment`
- ✅ No direct callers to `/api/admin` (root)
- ✅ Build green

### Phase 3.2 — API guard policy (COMPLETED)
- ✅ `/api/*` is no longer blanket-public; only `/api/auth/*` is public.
- ✅ Logged-out API calls return JSON `401` (not HTML redirects).
- ✅ `/api/admin/invite` GET no longer returns a misleading success payload.
- ✅ Verified: `GET /api/session/status` returns `401` when logged out.

### Phase 3.3 — Orphan purge + hygiene (IN PROGRESS)
#### 3.3.1 — Remove .DS_Store (COMPLETED)
- ✅ Deleted `.DS_Store` files across repo.
- ✅ Verified none are tracked by git.

#### 3.3.2 — Keep kit playground, but dev-only (COMPLETED)
- ✅ Moved route to `/dev/kit`.
- ✅ Updated docs to reference `/dev/kit` (not `/kit`).
- ✅ Verified repo has no remaining `/kit` references besides `/dev/kit`.

#### 3.3.3 — Generate route catalog (IN PROGRESS)
- ✅ Generated `apps/web/ROUTES_AND_GUARDS.md` (path → type → auth requirement → role requirement → notes).
- ☐ Confirm `/dev/kit` is guarded in prod (redirects to `/`).
- ☐ Review public surface area (pages + APIs) and confirm intent.
