import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export default async function AccessPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (!user) redirect('/login');

  // Read user's own profile status (RLS: user can only read their row)
  // `as any` avoids TypeScript friction if your generated Database types haven't been refreshed yet.
  const { data: profile } = await supabase
    .from('user_profile' as any)
    .select('status')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const status = (profile as any)?.status ?? 'pending';

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Access requires approval</h1>

      <p className="mt-3 text-sm text-[var(--to-ink-muted)]">
        Your account is not currently approved to use Insight.
      </p>

      <div
        className="mt-4 rounded border px-4 py-3"
        style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
          Current status
        </div>
        <div className="mt-1 font-mono text-sm text-[var(--to-ink)]">{String(status)}</div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: 'var(--to-border)' }}
        >
          Switch account
        </Link>

        <Link
          href="/"
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: 'var(--to-border)' }}
        >
          Back to landing
        </Link>
      </div>

      <p className="mt-6 text-sm text-[var(--to-ink-muted)]">
        Contact an administrator to request access. Once approved, refresh the page or reopen the app.
      </p>
    </main>
  );
}
