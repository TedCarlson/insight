// apps/web/src/app/layout.tsx
import type { ReactNode } from "react";

// Global styles
import "../styles/globals.css";

// Theme overrides (scoped by data-theme="glass" on <html>)
import "../styles/tokens.theme-glass.css";

import CoreNav from "@/components/CoreNav";
import FooterHelp from "@/components/FooterHelp";
import { OrgProvider } from "@/state/org";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="glass">
      <body className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
        <OrgProvider>
          <div className="min-h-screen flex flex-col">
            <CoreNav />
            <main className="flex-1 px-6 py-6">{children}</main>
            <FooterHelp />
          </div>
        </OrgProvider>
      </body>
    </html>
  );
}
