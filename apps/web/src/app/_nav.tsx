// apps/web/src/app/_nav.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/roster", label: "Roster" },
  { href: "/metrics", label: "Metrics" },
  { href: "/planning", label: "Planning" }
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 16,
          cursor: "pointer"
        }}
      >
        ☰
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fff",
            padding: 8,
            minWidth: 140,
            zIndex: 50
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "6px 10px",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "#111",
                  background: active ? "#f0f0f0" : "transparent"
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
