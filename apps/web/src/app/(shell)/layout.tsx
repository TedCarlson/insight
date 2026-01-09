import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Nav from "./nav";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) redirect("/login");

  return (
    <div className="min-h-screen w-full">
      <Nav />
      <main className="w-full">{children}</main>
    </div>
  );
}
