// apps/web/src/features/roster/components/rosterRowModule.actions.ts

export type PositionTitleRow = {
  position_title: string;
  sort_order?: number | null;
  active?: boolean | null;
};

export async function loadPositionTitlesAction(opts: {
  pcOrgId: string;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setRows: (rows: PositionTitleRow[]) => void;
}) {
  const { pcOrgId, setLoading, setError, setRows } = opts;

  if (!pcOrgId) return;

  setLoading(true);
  setError(null);

  try {
    // Server route exists: src/app/api/meta/position-titles/route.ts
    const res = await fetch(`/api/meta/position-titles?pc_org_id=${encodeURIComponent(pcOrgId)}`, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const rows: PositionTitleRow[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.rows)
        ? json.rows
        : Array.isArray(json?.data)
          ? json.data
          : [];

    // normalize
    setRows(
      rows
        .filter((r) => r && typeof (r as any).position_title === "string")
        .map((r) => ({
          position_title: String((r as any).position_title),
          sort_order: (r as any).sort_order ?? null,
          active: (r as any).active ?? null,
        }))
    );
  } catch (e: any) {
    setError(e?.message ?? String(e));
    setRows([]);
  } finally {
    setLoading(false);
  }
}