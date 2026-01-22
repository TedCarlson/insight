"use client";

import type { SelectHTMLAttributes } from "react";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cls("to-select", className)}>
      {children}
    </select>
  );
}
