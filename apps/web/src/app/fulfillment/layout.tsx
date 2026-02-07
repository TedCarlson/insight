import type { ReactNode } from "react";
import CoreNav from "@/components/CoreNav";
import FooterHelp from "@/components/FooterHelp";

export default function FulfillmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <CoreNav lob="FULFILLMENT" />

      <main className="flex-1 px-6 py-6">
        {children}
      </main>

      <FooterHelp />
    </div>
  );
}