// apps/web/src/components/ui/Tooltip.tsx
"use client";

import type { ReactNode } from "react";
import React, { useEffect, useId, useRef, useState } from "react";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function findFocusable(root: HTMLElement | null) {
  if (!root) return null;
  // Prefer an actual interactive element inside the wrapper.
  const el = root.querySelector<HTMLElement>(
    'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
  );
  return el ?? root;
}

/**
 * Tooltip
 * - Token-driven + semantic classes (styles/ui.css).
 * - Hover + keyboard focus support.
 * - Avoids cloneElement/ref access during render (strict compiler-era lint).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  offset = 8,
  delayMs = 120,
  closeDelayMs = 80,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  align?: Align;
  offset?: number;
  delayMs?: number;
  closeDelayMs?: number;
  className?: string;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const [open, setOpen] = useState(false);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpen(true), delayMs);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), closeDelayMs);
  };

  useEffect(() => () => clearTimers(), []);

  // Attach aria-describedby to a focusable element inside the wrapper (without cloneElement).
  useEffect(() => {
    const root = wrapRef.current;
    const target = findFocusable(root);
    if (!target) return;

    const existing = target.getAttribute("aria-describedby");
    const next = existing ? `${existing} ${id}` : id;
    target.setAttribute("aria-describedby", next);

    return () => {
      // Remove our id from aria-describedby on cleanup
      const cur = target.getAttribute("aria-describedby");
      if (!cur) return;
      const parts = cur.split(/\s+/).filter(Boolean).filter((p) => p !== id);
      if (parts.length === 0) target.removeAttribute("aria-describedby");
      else target.setAttribute("aria-describedby", parts.join(" "));
    };
  }, [id]);

  return (
    <span
      ref={wrapRef}
      className={cls("to-tooltip", className)}
      onMouseEnter={() => scheduleOpen()}
      onMouseLeave={() => scheduleClose()}
      onFocus={() => scheduleOpen()}
      onBlur={() => scheduleClose()}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className="to-tooltip__content"
        data-open={open ? "true" : "false"}
        data-side={side}
        data-align={align}
        style={{ ["--to-tooltip-offset" as any]: `${offset}px` }}
      >
        {content}
      </span>
    </span>
  );
}
