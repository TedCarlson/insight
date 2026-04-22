import type { ReactNode } from "react";

import "../styles/globals.css";
import "../styles/tokens.theme-glass.css";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-identifier",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="glass">
      <body className={`${ibmPlexMono.variable} min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]`}>
        {children}
      </body>
    </html>
  );
}