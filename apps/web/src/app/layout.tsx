// apps/web/src/app/layout.tsx
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

// Global styles
import "../styles/globals.css";
import "../styles/tokens.theme-glass.css";

import CoreNav from "@/components/CoreNav";
import FooterHelp from "@/components/FooterHelp";
import { OrgProvider } from "@/state/org";
import { SessionProvider } from "@/state/session";
import { ToastProvider } from "@/components/ui/Toast";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: ctx, error } = await supabase.rpc("user_context");

  if (error || !ctx || ctx.length === 0) {
    redirect("/not-ready");
  }

  const { mso_lob } = ctx[0];

  return (
    <html lang="en" data-theme="glass">
      <body className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
        <ToastProvider>
          <SessionProvider>
            <OrgProvider>
              <div className="min-h-screen flex flex-col">
                (props: CoreNavProps) = ReactElement
                <main className="flex-1 px-6 py-6">{children}</main>
                <FooterHelp />
              </div>
            </OrgProvider>
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}