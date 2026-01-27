"use client";

import type { ButtonHTMLAttributes } from "react";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Pill({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cls(
        "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-[var(--to-surface-2)]",
        active && "font-semibold",
        className
      )}
      style={{
        borderColor: "var(--to-border)",
        background: active ? "var(--to-pill-active-bg, transparent)" : "transparent",
      }}
    />
  );
}
