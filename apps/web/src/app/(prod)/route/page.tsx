// apps/web/src/app/(prod)/route/page.tsx

import RouteTable from './RouteTable'

export default function RoutePage() {
  return (
    <main className="flex h-full flex-col">
      <header
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--to-border)', background: 'var(--to-header-bg)' }}
      >
        <h1 className="text-lg font-semibold text-[var(--to-ink)]">Route</h1>
        <p className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Admin ledger view backed by <code>public.route_admin_v</code>. Create / edit occurs in an overlay.
        </p>
      </header>

      <section className="flex-1 min-h-0">
        <RouteTable />
      </section>
    </main>
  )
}
