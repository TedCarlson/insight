// apps/web/src/app/(prod)/assignment/page.tsx

import AssignmentTable from './AssignmentTable'

export default function AssignmentPage() {
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
        <h1 className="text-lg font-semibold text-[var(--to-ink)]">
          Assignments
        </h1>
        <p className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Admin ledger view backed by <code>public.assignment_admin_v</code>.
          Lookup is primarily by person (<code>full_name</code>) or{' '}
          <code>tech_id</code>. Create/edit is overlay-only.
        </p>
      </header>

      {/* Ledger */}
      <section className="flex-1 min-h-0">
        <AssignmentTable />
      </section>
    </main>
  )
}
