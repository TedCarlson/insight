// apps/web/src/app/layout.tsx

import type { ReactNode } from "react";
import "../styles/globals.css";
import CoreNav from "@/components/CoreNav";


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
        <CoreNav />
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
