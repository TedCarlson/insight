import type { HTMLAttributes, ReactNode } from "react";

type Variant = "default" | "subtle" | "elevated";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className = "",
  variant = "elevated",
  ...props
}: {
  children: ReactNode;
  className?: string;
  variant?: Variant;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      data-variant={variant}
      className={cls("to-card", `to-card--${variant}`, className)}
    >
      {children}
    </section>
  );
}
