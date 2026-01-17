// apps/web/src/app/(prod)/pc_org/page.tsx

import Pc_orgTable from './Pc_orgTable'

export default function PcOrgPage() {
  return (
    <main className="flex h-full flex-col">
      <header
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--to-border)', background: 'var(--to-header-bg)' }}
      >
        <h1 className="text-lg font-semibold text-[var(--to-ink)]">PC Org</h1>
        <p className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Admin ledger view backed by <code>public.pc_org_admin_v</code>. Create / edit occurs in an overlay.
        </p>
      </header>

      <section className="flex-1 min-h-0">
        <Pc_orgTable />
      </section>
    </main>
  )
}
