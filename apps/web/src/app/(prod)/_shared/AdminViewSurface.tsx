//apps/web/src/app/%28prod%29/_shared/AdminViewSurface.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminOverlay from './AdminOverlay';
import { createClient } from './supabase';
import { toBtnNeutral, toRowHover, toTableWrap, toThead } from './toStyles';

type Props = {
  title: string;
  viewName: string; // e.g. "company_admin_v" (in public schema)
  defaultLimit?: number;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function orderKeys(keys: string[]) {
  const preferred = [
    'id',
    'name',
    'full_name',
    'label',
    'code',
    'status',
    'active',
    'pc_org_id',
    'pc_id',
    'person_id',
    'company_id',
    'contractor_id',
    'created_at',
    'updated_at',
  ];

  const score = (k: string) => {
    const idx = preferred.indexOf(k);
    return idx === -1 ? 999 : idx;
  };

  return [...keys].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
}

export default function AdminViewSurface({ title, viewName, defaultLimit = 250 }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(defaultLimit);

  const [open, setOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase.from(viewName).select('*').limit(limit);

    if (error) {
      setErr(`${error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // viewName/limit are the intended triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewName, limit]);

  const columns = useMemo(() => {
    const first = rows?.[0];
    if (!first) return [];
    return orderKeys(Object.keys(first));
  }, [rows]);

  const visibleColumns = useMemo(() => columns.slice(0, 8), [columns]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();

    return rows.filter((r) => {
      try {
        return JSON.stringify(r).toLowerCase().includes(q);
      } catch {
        return false;
      }
    });
  }, [rows, search]);

  const onRowOpen = (row: any) => {
    setSelectedRow(row);
    setOpen(true);
  };

  const countLabel = loading ? '…' : String(filtered.length);

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-[var(--to-ink)]">
            Rows: <span className="font-mono">{countLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--to-ink-muted)]">Limit</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
            >
              {[100, 250, 500, 1000].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button onClick={load} className={cx(toBtnNeutral, 'px-2 py-1 text-sm')}>
              Refresh
            </button>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${title}…`}
          className="w-full max-w-md rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--to-accent,var(--to-border))]"
        />
      </div>

      {/* Error */}
      {err && (
        <div className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm">
          <div className="font-semibold text-red-700">Error loading {viewName}</div>
          <div className="mt-1 font-mono text-[12px] text-[var(--to-ink-muted)]">{err}</div>
          <div className="mt-2 text-[12px] text-[var(--to-ink-muted)]">
            Confirm the view exists in <span className="font-mono">public</span> and the anon role can read it.
          </div>
        </div>
      )}

      {/* Table */}
      <div className={toTableWrap}>
        <table className="min-w-full border-collapse text-sm">
          <thead className={cx('sticky top-0 border-b border-[var(--to-border)]', toThead)}>
            <tr>
              {visibleColumns.map((k) => (
                <th
                  key={k}
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-[var(--to-ink-muted)]" colSpan={visibleColumns.length}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--to-ink-muted)]" colSpan={visibleColumns.length}>
                  No rows found.
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr
                  key={row?.id ?? idx}
                  tabIndex={0}
                  className={cx('cursor-pointer border-b border-[var(--to-border)]', toRowHover)}
                  onClick={() => onRowOpen(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowOpen(row);
                    }
                  }}
                >
                  {visibleColumns.map((k) => {
                    const raw = row?.[k];
                    const v = formatCell(raw);

                    return (
                      <td key={k} className="px-3 py-2 align-top">
                        <div
                          className="max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap text-[var(--to-ink)]"
                          title={typeof v === 'string' ? v : undefined}
                        >
                          {v}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row Inspector */}
      <AdminOverlay
        open={open}
        mode="edit"
        title={`${title} row`}
        subtitle={selectedRow?.id ? `id: ${selectedRow.id}` : undefined}
        onClose={() => setOpen(false)}
        widthClassName="w-[900px] max-w-[94vw]"
        footer={
          <div className="flex w-full items-center justify-end">
            <button onClick={() => setOpen(false)} className={toBtnNeutral}>
              Close
            </button>
          </div>
        }
      >
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
            {viewName}
          </div>
          <pre className="max-h-[70vh] overflow-auto rounded-md border border-[var(--to-border)] bg-[var(--to-surface-2)] p-3 text-xs">
            {JSON.stringify(selectedRow, null, 2)}
          </pre>
        </div>
      </AdminOverlay>
    </div>
  );
}
