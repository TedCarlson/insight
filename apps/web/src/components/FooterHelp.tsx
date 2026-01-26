"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useSession } from "@/state/session";

export default function FooterHelp() {
  const { canSeeAdmin } = useSession();

  return (
    <footer className="mt-10 py-6 border-t border-black/10 text-sm text-black/70 flex items-center justify-between">
      <div>
        Need help?{" "}
        <a className="underline" href="mailto:support@teamoptix.com">
          support@teamoptix.com
        </a>
      </div>

      {canSeeAdmin ? (
        <Link href="/admin" className="inline-flex items-center gap-2 underline">
          <ShieldCheck className="h-4 w-4" />
          Admin
        </Link>
      ) : null}
    </footer>
  );
}
