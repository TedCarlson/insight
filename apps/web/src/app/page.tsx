//apps/web/src/app/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (data?.user) redirect("/home");

  return (
    <main style={{ padding: 24 }}>
      <h1>TeamOptix Insight</h1>
      <p>UI-first phase. Views are contracts. RLS stays enabled.</p>
      <div style={{ marginTop: 16 }}>
        <Link href="/login">Sign in</Link>
      </div>
    </main>
  );
}
