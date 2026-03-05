"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PersonHit = {
  person_id: string;
  full_name: string | null;
  emails: string | null;
  active: boolean | null;
};

export default function PersonJumpSelect() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<PersonHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const query = q.trim();

  useEffect(() => {
    let alive = true;

    if (query.length < 2) {
      setHits([]);
      setError(null);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/metrics/scorecard-person-search?q=${encodeURIComponent(query)}`, {
          method: "GET",
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          if (!alive) return;
          setHits([]);
          setError(`Search blocked (${res.status}). ${txt ? "See server response." : ""}`.trim());
          return;
        }

        const json = await res.json();
        const rows: any[] = Array.isArray(json?.rows) ? json.rows : [];

        const next: PersonHit[] = rows.map((r: any) => ({
          person_id: String(r.person_id),
          full_name: r.full_name ?? null,
          emails: r.emails ?? null,
          active: r.active ?? null,
        }));

        if (!alive) return;
        setHits(next);
      } catch (e: any) {
        if (!alive) return;
        setHits([]);
        setError("Search failed (network).");
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          placeholder="Search name, email…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <div className="w-24 text-right text-xs text-muted-foreground">{loading ? "Searching…" : ""}</div>
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-background shadow-lg">
          {error ? (
            <div className="p-3 text-sm text-red-600">{error}</div>
          ) : hits.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No matches</div>
          ) : (
            <div className="max-h-72 overflow-auto">
              {hits.map((h) => (
                <button
                  key={h.person_id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    router.push(`/metrics/tech-scorecard/${h.person_id}`);
                  }}
                >
                  <div className="text-sm font-medium">{h.full_name ?? h.person_id}</div>
                  <div className="text-xs text-muted-foreground">{h.emails ?? "—"}</div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t p-2 flex justify-end">
            <button type="button" className="rounded-md border px-3 py-1 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}