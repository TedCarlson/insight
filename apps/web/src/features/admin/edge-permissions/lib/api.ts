import type {
  EdgePermissionsGridResponse,
  EdgePermissionsQuery,
  EdgePermissionTogglePayload,
} from "../types";

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchEdgePermissionsGrid(query: EdgePermissionsQuery) {
  const res = await fetch(
    `/api/admin/edge-permissions${qs({
      q: query.q ?? "",
      lob: query.lob && query.lob !== "ALL" ? query.lob : undefined,

      scope: query.scope ?? "global",
      pc_org_id: query.pcOrgId ?? undefined,

      pageIndex: query.pageIndex ?? 0,
      pageSize: query.pageSize ?? 25,
    })}`,
    { method: "GET" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load edge permissions (${res.status})`);
  }

  const json = (await res.json()) as any;
  if (json?.ok === false) throw new Error(json?.error || "Failed to load");
  return json as EdgePermissionsGridResponse;
}

export async function toggleEdgePermission(payload: EdgePermissionTogglePayload) {
  const res = await fetch(`/api/admin/edge-permissions/toggle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Toggle failed (${res.status})`);
  }

  const json = (await res.json()) as any;
  if (json?.ok === false) throw new Error(json?.error || "Toggle failed");
  return json as { ok: true };
}