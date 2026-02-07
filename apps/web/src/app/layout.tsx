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

  // inside RootLayout, after resolving mso_lob

return (
  <html lang="en" data-theme="glass">
    <body className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
      <ToastProvider>
        <SessionProvider>
          <OrgProvider>
            {mso_lob === "FULFILLMENT" ? (
              <div id="lob-root">{children}</div>
            ) : (
              <div id="lob-root">{children}</div>
            )}
          </OrgProvider>
        </SessionProvider>
      </ToastProvider>
    </body>
  </html>
);
}