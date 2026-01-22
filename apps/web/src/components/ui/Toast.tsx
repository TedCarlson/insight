// apps/web/src/components/ui/Toast.tsx
"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ToastVariant = "default" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  title?: ReactNode;
  message?: ReactNode;
  variant: ToastVariant;
  durationMs: number;
};

type ToastInput = {
  id?: string;
  title?: ReactNode;
  message?: ReactNode;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastApi = {
  push: (t: ToastInput) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});
  // Avoid hydration mismatches by only rendering the portal after hydration.
  // useSyncExternalStore lets server snapshot be `false` and client snapshot be `true`,
  // without setState-in-effect (lint rule).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
    Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    timers.current = {};
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = input.id ?? genId();
      const item: ToastItem = {
        id,
        title: input.title,
        message: input.message,
        variant: input.variant ?? "default",
        durationMs: input.durationMs ?? 2600,
      };

      setToasts((prev) => [item, ...prev].slice(0, 5));

      // auto-dismiss
      if (item.durationMs > 0) {
        const timer = window.setTimeout(() => dismiss(id), item.durationMs);
        timers.current[id] = timer;
      }
    },
    [dismiss]
  );

  const api = useMemo(() => ({ push, dismiss, clear }), [push, dismiss, clear]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {mounted
        ? createPortal(<ToastViewport toasts={toasts} dismiss={dismiss} />, document.body)
        : null}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const tone =
    toast.variant === "success"
      ? "text-[var(--to-success)]"
      : toast.variant === "warning"
        ? "text-[var(--to-warning)]"
        : toast.variant === "danger"
          ? "text-[var(--to-danger)]"
          : "text-[var(--to-ink)]";

  return (
    <div
      className="rounded-xl border bg-[var(--to-surface)] px-3 py-2 shadow-[var(--to-shadow-sm)]"
      style={{ borderColor: "var(--to-border)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {toast.title ? (
            <div className={cls("text-sm font-semibold", tone)}>{toast.title}</div>
          ) : null}
          {toast.message ? (
            <div className="mt-0.5 text-sm text-[var(--to-ink-muted)]">{toast.message}</div>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="to-btn to-btn--ghost h-8 w-8 p-0 inline-flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
