'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const NAV_ITEMS = [
    { href: '/home', label: '🏠 Home' },
    { href: '/models', label: '🧩 Models' },
    { href: '/tasks', label: '✅ Tasks' },
    { href: '/data', label: '📊 Data' },
];

export default function Nav() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        const handleClick = (e: MouseEvent) =>
            ref.current && !ref.current.contains(e.target as Node) && setOpen(false);

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClick);
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClick);
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <header className="bg-[var(--to-surface)] text-[var(--to-ink)] border-b shadow-sm" ref={ref}>
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="text-xl font-bold">🛰️ Team Optix</div>

                <nav className="flex items-center gap-6">
                    {NAV_ITEMS.map(({ href, label }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`text-sm font-medium transition ${active
                                        ? 'text-[var(--to-blue-600)] font-semibold'
                                        : 'text-[var(--to-ink-muted)] hover:text-[var(--to-ink)]'
                                    }`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                    <button
                        onClick={handleLogout}
                        className="text-sm font-medium text-red-600 hover:underline"
                    >
                        Logout
                    </button>
                </nav>
            </div>
        </header>
    );
}
