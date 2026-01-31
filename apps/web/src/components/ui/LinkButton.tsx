// apps/web/src/components/ui/LinkButton.tsx
import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function LinkButton({
  variant = "secondary",
  className,
  children,
  ...props
}: LinkProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: Variant;
    className?: string;
    children: ReactNode;
  }) {
  const base = "to-btn px-4 py-3";
  const v =
    variant === "primary"
      ? "to-btn--primary"
      : variant === "secondary"
        ? "to-btn--secondary"
        : ""; // ghost uses base only; override via className if needed

  return (
    <Link {...props} className={cls(base, v, className)}>
      {children}
    </Link>
  );
}
