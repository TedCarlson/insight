// apps/web/src/app/(prod)/person/page.tsx

import PersonTable from './PersonTable'

export default function PersonPage() {
  return (
    <main className="flex h-full flex-col bg-[var(--to-surface)] text-[var(--to-ink)]">
      <header className="border-b border-[var(--to-border)] bg-[var(--to-header-bg)] px-6 py-4">
        <h1 className="text-lg font-semibold text-[var(--to-header-title)]">People</h1>
        <p className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Admin ledger view of all people records.
        </p>
      </header>

      <section className="flex-1 min-h-0">
        <PersonTable />
      </section>
    </main>
  )
}
