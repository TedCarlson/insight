import { Nav } from "../_nav";
import type { ReactNode } from "react";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Nav />
      <main style={{ padding: 16 }}>{children}</main>
    </div>
  );
}
