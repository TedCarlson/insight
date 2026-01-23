"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cls(
        "to-btn",
        variant === "primary"
          ? "to-btn--primary"
          : variant === "secondary"
            ? "to-btn--secondary"
            : "to-btn--ghost",
        className
      )}
    />
  );
}
