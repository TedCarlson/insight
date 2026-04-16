// path: apps/web/src/shared/server/workforce/buildDisplayName.ts

export function buildDisplayName(args: {
  preferred_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  const preferred = String(args.preferred_name ?? "").trim();
  const first = String(args.first_name ?? "").trim();
  const last = String(args.last_name ?? "").trim();

  const lead = preferred || first || "Unknown";
  return [lead, last].filter(Boolean).join(" ").trim();
}