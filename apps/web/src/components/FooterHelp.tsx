"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDE_ON_PREFIXES = ["/login", "/access", "/auth"];

export default function FooterHelp() {
  const pathname = usePathname();
  const shouldHide = HIDE_ON_PREFIXES.some((p) => pathname.startsWith(p));
  if (shouldHide) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href="/kit"
        aria-label="UI Kit"
        title="UI Kit"
        className="grid h-11 w-11 place-items-center rounded-full border bg-[var(--to-surface)] text-sm font-semibold shadow-sm hover:bg-[var(--to-surface-2)]"
        style={{ borderColor: "var(--to-border)", boxShadow: "var(--to-shadow-sm)" }}
      >
        ?
      </Link>
    </div>
  );
}
