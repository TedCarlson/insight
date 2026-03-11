export function formatFreshness(value: number | null) {
  if (!value) return "Not updated yet";

  const diffMs = Date.now() - value;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 5) return "Updated just now";
  if (diffSec < 60) return `Updated ${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  return `Updated ${diffHr}h ago`;
}