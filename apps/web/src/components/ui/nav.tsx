'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type NavItem = {
    href: string;
    label: string;
};

const DEV_NAV: NavItem[] = [
    { href: '/home', label: 'Home' },
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
    const supabase = createClientComponentClient();

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // UI-only gating:
    // - show Developer Menu only to owners
    // - show Admin Menu only to active users (owners can see it as well)
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>('unknown');
    const [isOwner, setIsOwner] = useState(false);

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
            try {
                const { data: userData } = await supabase.auth.getUser();
                const user = userData?.user ?? null;

                if (!mounted) return;

                if (!user) {
                    setIsOwner(false);
                    setProfileStatus('unknown');
                    return;
                }

                // owner check (RLS-protected by app_owners policies)
                try {
                    const { data: ownerBool } = await supabase.rpc('is_owner');
                    if (mounted) setIsOwner(!!ownerBool);
                } catch {
                    if (mounted) setIsOwner(false);
                }

                // profile status (RLS: user can read only their own row)
                try {
                    const { data: profile } = await supabase
                        .from('user_profile')
                        .select('status')
                        .eq('auth_user_id', user.id)
                        .maybeSingle();

                    const status = (profile as any)?.status as ProfileStatus | undefined;
                    if (mounted) setProfileStatus(status ?? 'pending');
                } catch {
                    if (mounted) setProfileStatus('pending');
                }
            } catch {
                if (mounted) {
                    setIsOwner(false);
                    setProfileStatus('unknown');
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
          ${active
                    ? 'bg-green-200 text-[var(--to-ink)]'
                    : 'text-[var(--to-ink-muted)] hover:bg-blue-100 hover:text-[var(--to-ink)]'
                }
        `}
            >
                {label}
            </Link>
        );
    };

    const canSeeAdmin = isOwner || profileStatus === 'active';
    const adminItems: NavItem[] = canSeeAdmin ? PROD_NAV : [{ href: '/access', label: 'Access' }];

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
                    className="fixed top-16 left-4 z-40 w-56 rounded bg-[var(--to-surface)] p-4 shadow-lg"
                >
                    <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                        Insight
                    </div>

                    {/* Small status hint (only when not active and not owner) */}
                    {!canSeeAdmin && profileStatus !== 'unknown' && (
                        <div
                            className="mb-4 rounded border px-3 py-2 text-xs"
                            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface-soft)' }}
                        >
                            <div className="font-semibold text-[var(--to-ink)]">Access required</div>
                            <div className="mt-1 text-[var(--to-ink-muted)]">
                                Your account is <span className="font-mono">{profileStatus}</span>.
                            </div>
                        </div>
                    )}

                    {isOwner && (
                        <div className="mb-4">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                                Developer Menu
                            </div>
                            <div className="flex flex-col gap-1">{DEV_NAV.map(renderItem)}</div>
                        </div>
                    )}

                    <div className="mb-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                            Admin Menu
                        </div>
                        <div className="flex flex-col gap-1">{adminItems.map(renderItem)}</div>
                    </div>

                    <div className="mt-6 border-t pt-3">
                        <button
                            onClick={logout}
                            className="text-sm font-medium text-red-600 hover:underline"
                        >
                            Logout
                        </button>
                    </div>
                </aside>
            )}
        </>
    );
}
