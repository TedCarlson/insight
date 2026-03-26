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
          : "min-h-screen flex flex-col lg:pl-72 pt-14 lg:pt-0"
      }
    >
      <main className={isTechRoute ? "flex-1 px-4 py-4 pb-24" : "flex-1 px-6 py-6 pb-24 lg:pb-6"}>
        {children}
      </main>

      {!isTechRoute ? (
        <div className="px-6">
          <FooterHelp />
        </div>
      ) : null}
    </div>
  );
}