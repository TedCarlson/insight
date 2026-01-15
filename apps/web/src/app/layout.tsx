// apps/web/src/app/layout.tsx

import type { ReactNode } from 'react'
import '../styles/globals.css'
import Nav from '@/components/ui/nav'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
        <Nav />
        <main className="pt-10">{children}</main>
      </body>
    </html>
  )
}

