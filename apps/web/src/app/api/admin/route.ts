// apps/web/src/app/api/admin/route.ts
// Backwards-compat wrapper.
// Legacy callers may still hit /api/admin; forward them to the real endpoint.

export { POST } from "../org/assignment/route";
