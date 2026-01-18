//apps/web/src/components/ui/nav.tsx

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/app/(prod)/_shared/supabase';

type NavItem = { href: string; label: string };

const DEV_NAV: NavItem[] = [
  { href: '/dev_home', label: 'Dev Home' },
  { href: '/models', label: 'Models' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/data', label: 'Data' },
];

const PROD_NAV: NavItem[] = [
  { href: '/person', label: 'People' },
  { href: '/assignment', label: 'Assignments' },
  { href: '/leadership', label: 'Leadership' },
  { href: '/company', label: 'Companies' },
  { href: '/contractor', label: 'Contractors' },
  { href: '/division', label: 'Divisions' },
  { href: '/mso', label: 'MSOs' },
  { href: '/pc', label: 'PCs' },
  { href: '/pc_org', label: 'PC Orgs' },
  { href: '/quota', label: 'Quotas' },
  { href: '/region', label: 'Regions' },
  { href: '/route', label: 'Routes' },
  { href: '/schedule', label: 'Schedules' },
];

type ProfileStatus = 'unknown' | 'active' | 'inactive' | 'pending';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  // IMPORTANT: use the SAME browser client that login uses
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('unknown');
  const [sessionLabel, setSessionLabel] = useState<string>(''); // ✅ Full Name — email
  const [isOwner, setIsOwner] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [debugErr, setDebugErr] = useState<string>('');

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClickOutside = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setOpen(false);

    document.addEventListener('keydown', onEscape);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadGateState() {
      setDebugErr('');

      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionErr) {
          console.log('[access] getSession error', sessionErr);
          setDebugErr(`getSession: ${sessionErr.message}`);
          setIsOwner(false);
          setRoles([]);
          setProfileStatus('unknown');
          setSessionLabel('');
          return;
        }

        const session = sessionData?.session ?? null;
        if (!session?.user) {
          setDebugErr('No session user found');
          setIsOwner(false);
          setRoles([]);
          setProfileStatus('unknown');
          setSessionLabel('');
          return;
        }

        // ✅ Session label: "Full Name — email" (fallbacks included)
        const u = session.user;
        const fullName =
          (u.user_metadata as any)?.full_name ||
          (u.user_metadata as any)?.name ||
          (u.user_metadata as any)?.display_name ||
          '';

        const email = u.email || '';
        const label = fullName && email ? `${String(fullName)} — ${String(email)}` : String(fullName || email || '');
        setSessionLabel(label);

        const { data, error } = await supabase.rpc('get_access_context');

        if (!mounted) return;

        if (error) {
          console.log('[access] rpc(get_access_context) error', error);
          setDebugErr(`rpc: ${error.message}`);
          setIsOwner(false);
          setRoles([]);
          setProfileStatus('unknown');
          return;
        }

        if (!data) {
          console.log('[access] rpc(get_access_context) returned null data');
          setDebugErr('rpc returned null data');
          setIsOwner(false);
          setRoles([]);
          setProfileStatus('unknown');
          return;
        }

        const ctx = data as any;

        setIsOwner(!!ctx.is_owner);
        setRoles(Array.isArray(ctx.roles) ? ctx.roles : []);

        const rawStatus = (ctx.status as string | null | undefined) ?? 'pending';
        const status: ProfileStatus =
          rawStatus === 'active' || rawStatus === 'inactive' || rawStatus === 'pending'
            ? rawStatus
            : 'unknown';

        setProfileStatus(status);
      } catch (e: any) {
        console.log('[access] unexpected error', e);
        if (mounted) {
          setDebugErr(`unexpected: ${e?.message ?? String(e)}`);
          setIsOwner(false);
          setRoles([]);
          setProfileStatus('unknown');
          setSessionLabel('');
        }
      }
    }

    loadGateState();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadGateState();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== '/' && pathname?.startsWith(href + '/')) return true;
    return false;
  };

  const renderItem = ({ href, label }: NavItem) => {
    const active = isActive(href);

    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={`
          block rounded px-3 py-2 text-sm font-medium transition
          ${
            active
              ? 'bg-blue-200 text-[var(--to-ink)]'
              : 'text-[var(--to-ink-muted)] hover:bg-blue-100 hover:text-[var(--to-ink)]'
          }
        `}
      >
        {label}
      </Link>
    );
  };

  const canSeeAdmin = isOwner || profileStatus === 'active';
  const canSeeDev = isOwner || roles.includes('dev');

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-1 left-4 z-50 text-xl font-bold text-[var(--to-header-title)]"
        aria-label="Open menu"
      >
        ≡
      </button>

      {open && (
        <aside
          ref={ref}
          className="fixed top-0 left-0 z-40 h-full w-72 overflow-y-auto border-r bg-white px-4 py-6 shadow-xl"
        >
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Session
            </div>

            <div className="mt-2 rounded border bg-[var(--to-surface-soft)] p-2 text-xs text-[var(--to-ink)]">
              <div>
                Status: <span className="font-mono">{profileStatus}</span>.
              </div>

              {sessionLabel ? (
                <div className="mt-1">
                  User: <span className="font-mono">{sessionLabel}</span>
                </div>
              ) : null}

              {debugErr ? (
                <div className="mt-2 text-[10px] text-red-700">
                  <div className="font-semibold">Access debug:</div>
                  <div className="font-mono break-words">{debugErr}</div>
                </div>
              ) : null}
            </div>
          </div>

          {canSeeDev && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Developer Menu
              </div>
              <div className="flex flex-col gap-1">{DEV_NAV.map(renderItem)}</div>
            </div>
          )}

          {canSeeAdmin ? (
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Admin Menu
              </div>
              <div className="flex flex-col gap-1">{PROD_NAV.map(renderItem)}</div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Access
              </div>
              <div className="flex flex-col gap-1">
                {[{ href: '/access', label: 'Access' }].map(renderItem)}
              </div>
            </div>
          )}

          <div className="mt-6 border-t pt-3">
            <button onClick={logout} className="text-sm font-medium text-red-600 hover:underline">
              Logout
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
