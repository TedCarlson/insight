"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPage() {
    const supabase = supabaseBrowser();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const onSet = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setBusy(true);

        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false);

        if (error) return setErr(error.message);

        router.replace("/home");
        router.refresh();
    };

    return (
        <main style={{ padding: 24, maxWidth: 520 }}>
            <h1>Set new password</h1>
            <form onSubmit={onSet} style={{ display: "grid", gap: 12, marginTop: 16 }}>
                <label>
                    New password
                    <input
                        value={password}
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: "100%" }}
                    />
                </label>
                {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
                <button type="submit" disabled={busy || !password}>
                    {busy ? "Saving..." : "Save password"}
                </button>
            </form>
        </main>
    );
}
