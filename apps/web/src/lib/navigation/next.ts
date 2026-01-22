export function normalizeNext(input: string | null): string {
  const raw = (input ?? "/").trim() || "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/"; // block protocol-relative open redirects
  return raw;
}
