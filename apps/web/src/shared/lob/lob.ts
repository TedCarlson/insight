//apps/web/src/shared/lob/lob.ts// apps/web/src/shared/lob/lob.ts
export type Lob = "FULFILLMENT" | "LOCATE";

const KEY = "to_lob";

export function rememberLob(lob: Lob) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, lob);
  } catch {
    // ignore
  }
}

export function getRememberedLob(): Lob {
  try {
    if (typeof window === "undefined") return "FULFILLMENT";
    const v = window.localStorage.getItem(KEY);
    return v === "LOCATE" ? "LOCATE" : "FULFILLMENT";
  } catch {
    return "FULFILLMENT";
  }
}

export function resolveLobFromPathname(pathname: string): Lob {
  const p = String(pathname ?? "");
  if (p.startsWith("/locate")) return "LOCATE";
  if (p.startsWith("/fulfillment")) return "FULFILLMENT";
  return getRememberedLob();
}

/**
 * Use pathname when available (explicit floors), otherwise fallback to remembered LOB.
 * Safe default: FULFILLMENT.
 */
export function resolveActiveLob(pathname?: string): Lob {
  if (pathname) return resolveLobFromPathname(pathname);
  return getRememberedLob();
}

export function lobLabel(lob: Lob | null | undefined): string {
  if (lob === "LOCATE") return "Locate";
  if (lob === "FULFILLMENT") return "Fulfillment";
  return "—";
}