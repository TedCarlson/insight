import { Suspense } from "react";
import SetPasswordClient from "./SetPasswordClient";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
      <SetPasswordClient />
    </Suspense>
  );
}
