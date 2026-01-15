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
    { href: '/prod', label: 'Prod Home' },
    { href: '/person', label: 'People' }, // ✅ fixed path
];

export default function Nav() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const envLabel = process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV';

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

    const renderItem = ({ href, label }: NavItem) => {
        const active = pathname === href;

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
            {/* Floating hamburger button */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed top-1 left-4 z-50 text-xl font-bold text-[var(--to-header-title)]"
                aria-label="Open menu"
            >
                ≡
            </button>

            {/* Drawer */}
            {open && (
                <aside
                    ref={ref}
                    className="fixed top-16 left-4 z-40 w-56 rounded bg-[var(--to-surface)] p-4 shadow-lg"
                >
                    {/* ENV tag */}
                    <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                        {'Menu'}
                    </div>

                    {/* DEV section */}
                    <div className="mb-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                            Dev
                        </div>
                        <div className="flex flex-col gap-1">
                            {DEV_NAV.map(renderItem)}
                        </div>
                    </div>

                    {/* PROD section */}
                    <div className="mb-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                            Prod
                        </div>
                        <div className="flex flex-col gap-1">
                            {PROD_NAV.map(renderItem)}
                        </div>
                    </div>

                    {/* Logout */}
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
