// apps/web/src/components/ui/DropdownMenu.tsx
"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type Side = "top" | "bottom";
type Align = "start" | "center" | "end";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function focusFirstItem(contentEl: HTMLDivElement | null) {
  if (!contentEl) return;
  const items = Array.from(
    contentEl.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-disabled="true"])')
  );
  items[0]?.focus();
}

function moveFocus(contentEl: HTMLDivElement | null, dir: 1 | -1) {
  if (!contentEl) return;
  const items = Array.from(
    contentEl.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-disabled="true"])')
  );
  if (items.length === 0) return;

  const active = document.activeElement as HTMLElement | null;
  const idx = active ? items.indexOf(active) : -1;
  const next =
    idx === -1 ? (dir === 1 ? 0 : items.length - 1) : (idx + dir + items.length) % items.length;

  items[next]?.focus();
}

/**
 * DropdownMenu (primitive)
 * - Token-driven + semantic classes (styles/ui.css).
 * - Click, keyboard (Enter/Space/ArrowDown), escape, outside click dismissal.
 *
 * NOTE: This file is written to satisfy strict compiler-era lint rules:
 * - Avoid useContext passing refs/state into subcomponents.
 * - Keep refs local to the root component and use event delegation.
 */
export function DropdownMenu({
  trigger,
  children,
  open: openProp,
  onOpenChange,
  side = "bottom",
  align = "start",
  offset = 8,
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: Side;
  align?: Align;
  offset?: number;
  className?: string;
}) {
  const menuId = useId();
  const triggerWrapRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const open = openProp ?? openUncontrolled;

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const value = typeof next === "function" ? next(open) : next;
      if (openProp === undefined) setOpenUncontrolled(value);
      onOpenChange?.(value);
    },
    [open, openProp, onOpenChange]
  );

  // outside click + escape dismissal
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerWrapRef.current?.contains(t)) return;
      if (contentRef.current?.contains(t)) return;
      setOpen(false);
      triggerWrapRef.current?.focus?.();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerWrapRef.current?.focus?.();
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, setOpen]);

  // When opening, focus first item (after paint)
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => focusFirstItem(contentRef.current), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Precompute attrs so we don't call functions in render (strict lint)
  const triggerAttrs = useMemo(
    () => ({
      id: `${menuId}-trigger`,
      "aria-haspopup": "menu" as const,
      "aria-expanded": open,
      "aria-controls": menuId,
    }),
    [menuId, open]
  );

  const contentAttrs = useMemo(
    () => ({
      id: menuId,
      "data-open": open ? "true" : "false",
      "data-side": side,
      "data-align": align,
      style: { ["--to-menu-offset" as any]: `${offset}px` },
    }),
    [menuId, open, side, align, offset]
  );

  return (
    <span className={cls("to-menu", className)} data-open={open ? "true" : "false"}>
      {/* Trigger wrapper so trigger can be any node (including a <button>) without nesting buttons */}
      <span
        ref={triggerWrapRef}
        className="to-menu__triggerWrap"
        role="button"
        tabIndex={0}
        {...triggerAttrs}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
      >
        {trigger}
      </span>

      <div
        ref={contentRef}
        role="menu"
        aria-hidden={!open}
        tabIndex={-1}
        className="to-menu__content"
        {...contentAttrs}
        onClick={(e) => {
          // Event delegation: close on selecting a menuitem unless keepOpen/disabled
          const el = e.target as HTMLElement | null;
          const item = el?.closest?.('[role="menuitem"]') as HTMLElement | null;
          if (!item) return;
          if (item.getAttribute("data-disabled") === "true") return;
          if (item.getAttribute("data-keep-open") === "true") return;
          setOpen(false);
          triggerWrapRef.current?.focus?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            triggerWrapRef.current?.focus?.();
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            moveFocus(contentRef.current, 1);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            moveFocus(contentRef.current, -1);
          }
          if (e.key === "Tab") {
            setOpen(false);
          }
        }}
      >
        {children}
      </div>
    </span>
  );
}

export function DropdownMenuLabel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div {...props} className={cls("to-menu__label", className)} role="presentation">
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cls("to-menu__sep", className)} role="separator" />;
}

export function DropdownMenuItem({
  children,
  onSelect,
  disabled,
  tone,
  keepOpen,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> & {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  keepOpen?: boolean;
}) {
  const danger = tone === "danger";

  return (
    <button
      {...props}
      type="button"
      role="menuitem"
      data-disabled={disabled ? "true" : "false"}
      data-keep-open={keepOpen ? "true" : "false"}
      disabled={disabled}
      className={cls(
        "to-menu__item",
        danger && "to-menu__item--danger",
        disabled && "to-menu__item--disabled",
        className
      )}
      tabIndex={-1}
      onClick={(e) => {
        props.onClick?.(e);
        if (disabled) return;
        onSelect?.();
        // close handled by parent (event delegation) unless keepOpen
      }}
    >
      {children}
    </button>
  );
}
