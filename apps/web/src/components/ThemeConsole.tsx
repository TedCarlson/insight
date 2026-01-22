// apps/web/src/components/ThemeConsole.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "to_theme";
type ThemeId = "glass";

export default function ThemeConsole() {
  const [theme, setTheme] = useState<ThemeId>(() => {
  if (typeof window === "undefined") return "glass";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "glass" ? "glass" : "glass";
});


  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className="fixed bottom-4 right-16 z-50">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeId)}
        className="to-select"
        aria-label="Theme console"
        title="Theme console"
      >
        <option value="glass">Glass</option>
      </select>
    </div>
  );
}
