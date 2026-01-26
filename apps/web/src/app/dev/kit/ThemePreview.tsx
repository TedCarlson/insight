// apps/web/src/app/dev/kit/ThemePreview.tsx
"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type ThemeId = "default" | "theme-a";

export default function ThemePreview({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("default");

  const note = useMemo(() => {
    if (theme === "default") return "Default tokens";
    if (theme === "theme-a") return "Theme A (preview)";
    return theme;
  }, [theme]);

  return (
    <div data-theme={theme === "default" ? undefined : theme} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Theme preview</div>
          <div className="text-xs text-[var(--to-ink-muted)]">{note} • only affects this page</div>
        </div>

        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeId)}
          className="h-10 rounded border bg-[var(--to-surface)] px-3 text-sm outline-none"
          style={{ borderColor: "var(--to-border)" }}
          aria-label="Theme"
        >
          <option value="default">Default</option>
          <option value="theme-a">Theme A</option>
        </select>
      </div>

      {children}
    </div>
  );
}
