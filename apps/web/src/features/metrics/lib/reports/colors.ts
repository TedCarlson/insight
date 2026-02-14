export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "").trim();
  if (!(h.length === 3 || h.length === 6)) return null;

  const full =
    h.length === 3
      ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
      : h;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isWhiteLike(bg: string) {
  const s = String(bg ?? "").trim().toLowerCase();
  return (
    s === "#fff" ||
    s === "#ffffff" ||
    s === "white" ||
    s === "rgb(255,255,255)" ||
    s === "rgb(255, 255, 255)"
  );
}