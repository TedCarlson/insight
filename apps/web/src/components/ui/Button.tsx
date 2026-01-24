// apps/web/src/components/ui/Button.tsx
"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    // Layout + typography
    "to-btn inline-flex items-center justify-center gap-2 whitespace-nowrap select-none" +
    // Shape + motion
    " rounded-xl transition-[transform,opacity,background-color,box-shadow,border-color,color] duration-150 ease-out" +
    // Press feedback
    " active:translate-y-px" +
    // Consistent focus (global focus-visible rules already exist)
    " focus-visible:outline-none";

  const vPrimary =
    // Core
    "to-btn--primary" +
    // Slight highlight + depth (still neutral; uses your surface tokens)
    " shadow-[0_10px_28px_rgba(15,23,42,0.12)]" +
    // Subtle hover polish (avoid gaudy glow)
    " hover:opacity-95";

  const vSecondary =
    // Core surface button
    "to-btn--secondary bg-[var(--to-surface)] text-[var(--to-ink)]" +
    // Slight depth so it doesn’t feel “flat”
    " shadow-[0_1px_0_rgba(15,23,42,0.06)]";

  const vGhost =
    // Modern tertiary button (not link-like)
    "bg-transparent text-[var(--to-ink)]" +
    " hover:bg-[var(--to-surface-2)]";

  return (
  <button
    {...props}
    className={cls(
      base,
      variant === "primary"
        ? vPrimary
        : variant === "secondary"
          ? vSecondary
          : vGhost,
      className
    )}
  >
    {children}
  </button>
);

}
