export function resolveOfficeLabel(args: {
  assignment: any;
  orgLabelsById?: Map<string, string>;
}) {
  const { assignment, orgLabelsById } = args;

  // 1. direct office fields (future-proof)
  const direct =
    assignment?.office_name ||
    assignment?.office ||
    assignment?.market_name;

  if (direct && String(direct).trim()) {
    return String(direct).trim();
  }

  // 2. org label fallback (current likely path)
  const pcOrgId = String(assignment?.pc_org_id ?? "").trim();

  if (pcOrgId && orgLabelsById?.has(pcOrgId)) {
    return orgLabelsById.get(pcOrgId)!;
  }

  // 3. last resort (what you're seeing now)
  return pcOrgId || "Unknown";
}