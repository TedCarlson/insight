// apps/web/src/app/(shell)/layout.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/auth-helpers-nextjs';

import Nav from './nav';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        const getSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                router.replace('/login');
            } else {
                setSession(data.session);
            }
            setLoading(false);
        };

        getSession();
    }, []);

    if (loading) {
        return null;
    }

    return (
        <div>
            <Nav />
            <main className="p-4">{children}</main>
        </div>
    );
}
