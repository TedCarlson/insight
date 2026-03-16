// apps/web/src/app/(app)/tech/field-log/new/page.tsx
import { FieldLogRuntimeProvider } from "@/features/field-log/context/FieldLogRuntimeProvider";
import { FieldLogRuntimeGate } from "@/features/field-log/components/FieldLogRuntimeGate";
import FieldLogNewClient from "@/features/field-log/pages/FieldLogNewClient";

export const runtime = "nodejs";

export default function TechFieldLogNewPage() {
  return (
    <FieldLogRuntimeProvider>
      <FieldLogRuntimeGate>
        <FieldLogNewClient />
      </FieldLogRuntimeGate>
    </FieldLogRuntimeProvider>
  );
}