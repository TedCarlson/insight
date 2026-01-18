import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
