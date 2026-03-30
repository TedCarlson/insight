// apps/web/src/components/TechRouteGate.tsx

"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/state/session";
import { useOrg } from "@/state/org";
import { useAccessPass } from "@/state/access";
import { isElevated, isTechExperienceUser } from "@/shared/access/access";

function isAllowedTechPath(pathname: string) {
  return (
    pathname === "/tech" ||
    pathname.startsWith("/tech/") ||
    pathname === "/field-log" ||
    pathname.startsWith("/field-log/")
  );
}

export default function TechRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { ready, signedIn } = useSession();
  const { selectedOrgId } = useOrg();
  const { accessPass } = useAccessPass();

  const waitingOnAccess = !!selectedOrgId && !accessPass;
  const isElevatedUser = useMemo(() => isElevated(accessPass), [accessPass]);
  const isTechUser = useMemo(() => isTechExperienceUser(accessPass), [accessPass]);

  const shouldRedirect =
    ready &&
    signedIn &&
    !!selectedOrgId &&
    !waitingOnAccess &&
    !isElevatedUser &&
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