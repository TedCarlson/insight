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
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "0px solid transparent",
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 16,
          cursor: "pointer",
          color: "var(--to-blue-900)"
        }}
        title="Menu"
        type="button"
      >
        ☰
      </button>

      {open && (
        <>
          {/* Backdrop blur + dim (reduced blur for perf) */}
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.05)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              zIndex: 40
            }}
          />

          {/* Menu */}
          <div
            role="menu"
            style={{
              position: "absolute",
              top: 42,
              left: 0,
              border: "1px solid var(--to-border)",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.94)",
              padding: 8,
              minWidth: 160,
              zIndex: 50,
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)"
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  style={{
                    display: "block",
                    padding: "8px 10px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: active ? "var(--to-blue-900)" : "var(--to-ink)",
                    background: active ? "rgba(27, 99, 182, 0.08)" : "transparent",
                    border: active ? "1px solid rgba(27, 99, 182, 0.16)" : "1px solid transparent"
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
