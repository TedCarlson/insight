// apps/web/src/app/kit/layout.tsx
import type { ReactNode } from "react";

// Scoped theme CSS for /kit only.
// This file can define variables under [data-theme="..."] selectors.
import "@/styles/tokens.theme-a.css";

export default function KitLayout({ children }: { children: ReactNode }) {
  return children;
}
