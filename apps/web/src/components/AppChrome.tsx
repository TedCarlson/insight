// path: apps/web/src/components/AppChrome.tsx

"use client";

import { usePathname } from "next/navigation";
import FooterHelp from "@/components/FooterHelp";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTechRoute = pathname === "/tech" || pathname.startsWith("/tech/");

  return (
    <div
      className={
        isTechRoute
          ? "min-h-screen flex flex-col pt-14"
          : "min-h-screen flex flex-col pt-14"
      }
    >
      <main
        className={
          isTechRoute
            ? "flex-1 px-4 py-4 pb-24"
            : "flex-1 px-6 py-6 pb-24"
        }
      >
        {children}
      </main>

      {!isTechRoute ? (
        <div className="px-6 pb-6">
          <FooterHelp />
        </div>
      ) : null}
    </div>
  );
}