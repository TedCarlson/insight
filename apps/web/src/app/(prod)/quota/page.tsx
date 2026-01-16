import AdminViewSurface from '../_shared/AdminViewSurface';

export default function QuotaPage() {
    return (
        <main className="flex h-full flex-col">
            <header
                className="border-b px-6 py-4"
                style={{ borderColor: 'var(--to-border)', background: 'var(--to-header-bg)' }}
            >
                <h1 className="text-xl font-semibold" style={{ color: 'var(--to-header-title)' }}>
                    Quota
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--to-ink-muted)' }}>
                    Backed by <span className="font-mono">public.quota_admin_v</span>
                </p>
            </header>

            <section className="flex-1 overflow-auto p-6">
                <AdminViewSurface title="Quota" viewName="quota_admin_v" />
            </section>
        </main>
    );
}
