//apps/web/src/app/(public)/login/reset/page.tsx

import { Suspense } from "react";
import ResetClient from "./ResetClient";

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
      <ResetClient />
    </Suspense>
  );
}
