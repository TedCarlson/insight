///apps/web/src/app/(prod)/leadership/page.tsx

import LeadershipTable from './LeadershipTable'

export default function LeadershipPage() {
    return (
        <main className="flex h-full flex-col">
            <header
                className="border-b px-6 py-4"
                style={{ borderColor: 'var(--to-border)', background: 'var(--to-header-bg)' }}
            >
                <h1 className="text-xl font-semibold" style={{ color: 'var(--to-header-title)' }}>
                    Leadership
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--to-ink-muted)' }}>
                    Read surface backed by <span className="font-mono">public.assignment_leadership_admin_v</span>
                </p>
            </header>

            <section className="flex-1 overflow-auto p-6">
                <LeadershipTable />
            </section>
        </main>
    )
}
