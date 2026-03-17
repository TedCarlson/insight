// Replace the entire file:
// apps/web/src/components/TechRouteGate.tsx

"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/state/session";
import { useOrg } from "@/state/org";
import { useAccessPass } from "@/state/access";
import { isTechExperienceUser } from "@/shared/access/access";

function isAllowedTechPath(pathname: string) {
  return pathname === "/tech" || pathname.startsWith("/tech/");
}

export default function TechRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { ready, signedIn } = useSession();
  const { selectedOrgId } = useOrg();
  const { accessPass } = useAccessPass();

  const waitingOnAccess = !!selectedOrgId && !accessPass;
  const isTechUser = useMemo(() => isTechExperienceUser(accessPass), [accessPass]);

  const shouldRedirect =
    ready &&
    signedIn &&
    selectedOrgId &&
    !waitingOnAccess &&
    isTechUser &&
    !isAllowedTechPath(pathname);

  useEffect(() => {
    if (!shouldRedirect) return;
    router.replace("/tech");
  }, [shouldRedirect, router]);

  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
}