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
    //{ href: '/prod', label: 'Home Placeholder' },
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

export default function Nav() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

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

                    <div className="mb-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                            Developer Menu
                        </div>
                        <div className="flex flex-col gap-1">{DEV_NAV.map(renderItem)}</div>
                    </div>

                    <div className="mb-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                            Admin Menu
                        </div>
                        <div className="flex flex-col gap-1">{PROD_NAV.map(renderItem)}</div>
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
