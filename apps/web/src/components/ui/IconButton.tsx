// apps/web/src/components/ui/IconButton.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Size = "sm" | "md";
type Variant = "secondary" | "ghost";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * IconButton
 * - Use for small glyph actions (help, settings, kebab, row actions).
 * - Requires aria-label for accessibility.
 */
export function IconButton({
  icon,
  size = "md",
  variant = "secondary",
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: ReactNode;
  size?: Size;
  variant?: Variant;
}) {
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  const variantClass =
    variant === "ghost" ? "to-btn to-btn--ghost" : "to-btn to-btn--secondary";

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cls(
        variantClass,
        dim,
        "p-0 inline-flex items-center justify-center",
        className
      )}
    >
      {icon}
    </button>
  );
}
