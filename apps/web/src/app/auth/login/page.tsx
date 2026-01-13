// apps/web/src/app/auth/login/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Session } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();

    const [session, setSession] = useState<Session | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setSession(data.session);
                router.push('/home'); // redirect if already signed in
            }
        });
    }, [router, supabase]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
        } else if (data.session) {
            setSession(data.session);
            router.push('/home'); // redirect on successful login
        }
    };

    return (
        <main className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <button type="submit" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                    Sign In
                </button>
                {error && <p className="text-red-600">{error}</p>}
            </form>
        </main>
    );
}
