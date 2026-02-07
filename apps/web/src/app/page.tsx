import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/data/supabase/server";

export default async function Page() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users go straight to the Fulfillment floor (default LOB)
  if (user) redirect("/fulfillment");

  // Logged-out users stay on "/" (prevents auth redirect loops)
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">TeamOptix Insight</h1>
      <p className="text-base text-muted-foreground">Please sign in to continue.</p>

      <div className="flex gap-3">
        <Link
          className="to-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium"
          href="/login"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}