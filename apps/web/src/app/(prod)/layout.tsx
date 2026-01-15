// src/app/(prod)/layout.tsx

import type { ReactNode } from 'react'

export default function ProdLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
