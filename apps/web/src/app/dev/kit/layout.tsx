// apps/web/src/app/dev/kit/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

// Scoped theme CSS for the Kit playground only.
// (Keeps your visual sandbox consistent without affecting the rest of the app.)
import "../../../styles/tokens.theme-glass.css";

export default function KitLayout({ children }: { children: ReactNode }) {
  // Do not ship the kit playground to production.
  if (process.env.NODE_ENV !== "development") redirect("/");

  return (
    <div className="min-h-screen bg-[var(--to-surface-soft)] text-[var(--to-ink)]">
      {children}
    </div>
  );
}
