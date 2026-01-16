// apps/web/src/app/(public)/login/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/app/(prod)/_shared/supabase';

export default function LoginPage() {
  const router = useRouter();

  // IMPORTANT: use the SAME client helper as the rest of the UI
  const supabase = useMemo(() => createClient(), []);

  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        setSession(data.session);
        router.push('/home'); // keep existing behavior (no landing decision changes here)
      }
    });

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      setSession(data.session);
      router.push('/home'); // keep existing behavior
    } else {
      setError('Login succeeded but no session was returned.');
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
        {session && <p className="text-xs text-gray-600">Session active.</p>}
      </form>
    </main>
  );
}
