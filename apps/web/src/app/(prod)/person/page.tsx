// apps/web/src/app/(prod)/person/page.tsx

import PersonTable from './PersonTable'

export default function PersonPage() {
  return (
    <main className="flex h-full flex-col">
      {/* Header */}
      <header
        className="border-b px-6 py-4"
        style={{
          borderColor: 'var(--to-border)',
          background: 'var(--to-header-bg)',
        }}
      >
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--to-header-title)' }}
        >
          People
        </h1>
        <p className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Admin ledger view of all people records.
        </p>
      </header>

      {/* Ledger */}
      <section className="flex-1 min-h-0">
        <PersonTable />
      </section>
    </main>
  )
}
