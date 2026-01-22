// apps/web/src/app/layout.tsx
import type { ReactNode } from "react";

// Global styles
import "../styles/globals.css";

// Theme overrides (scoped by data-theme="glass" on <html>)
import "../styles/tokens.theme-glass.css";

import CoreNav from "@/components/CoreNav";
import FooterHelp from "@/components/FooterHelp";
import ThemeConsole from "@/components/ThemeConsole";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
        <CoreNav />
        <main className="p-6">{children}</main>

        {/* Global UI command center */}
        <ThemeConsole />
        <FooterHelp />
      </body>
    </html>
  );
}
