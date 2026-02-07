import type { ReactNode } from "react";

import "../styles/globals.css";
import "../styles/tokens.theme-glass.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="glass">
      <body className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
        {children}
      </body>
    </html>
  );
}