import type { Frame } from "../types";

export function todayISODateLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function detectFrameLocal(): Frame {
  const h = new Date().getHours();
  return h < 12 ? "AM" : "PM";
}