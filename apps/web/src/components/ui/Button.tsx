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
    // Base button system (tokens + hover + disabled handled in ui.css via .to-btn + variants)
    "to-btn inline-flex items-center justify-center gap-2 whitespace-nowrap select-none" +
    // Shape + motion
    " rounded-xl transition-[transform,opacity,background-color,box-shadow,border-color,color] duration-150 ease-out" +
    // Press feedback
    " active:translate-y-px" +
    // Focus
    " focus-visible:outline-none";

  // IMPORTANT:
  // Do NOT set text colors / hover backgrounds here for primary.
  // Those are already defined in ui.css on .to-btn--primary / --secondary / --ghost.
  const vPrimary = "to-btn--primary";
  const vSecondary = "to-btn--secondary";
  const vGhost = "to-btn--ghost";

  return (
    <button
      {...props}
      className={cls(
        base,
        variant === "primary" ? vPrimary : variant === "secondary" ? vSecondary : vGhost,
        className
      )}
    >
      {children}
    </button>
  );
}