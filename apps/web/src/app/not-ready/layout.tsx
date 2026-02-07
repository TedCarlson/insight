import type { ReactNode } from "react";

import CoreNav from "@/components/CoreNav";
import FooterHelp from "@/components/FooterHelp";
import { OrgProvider } from "@/state/org";
import { SessionProvider } from "@/state/session";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * This route is outside the (app) group, so it needs its own shell
 * to keep CoreNav + OrgSelector available for admins.
 */
export default function NotReadyLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider>
        <OrgProvider lob="FULFILLMENT">
          <div className="min-h-screen flex flex-col">
            <CoreNav lob="FULFILLMENT" />
            <main className="flex-1 px-6 py-6">{children}</main>
            <FooterHelp />
          </div>
        </OrgProvider>
      </SessionProvider>
    </ToastProvider>
  );
}