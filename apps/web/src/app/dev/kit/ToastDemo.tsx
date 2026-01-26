// apps/web/src/app/dev/kit/ToastDemo.tsx
"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function ToastDemo() {
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          toast.push({
            title: "Saved",
            message: "Changes were saved successfully.",
            variant: "success",
          })
        }
      >
        Success toast
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          toast.push({
            title: "Heads up",
            message: "Something needs your attention.",
            variant: "warning",
          })
        }
      >
        Warning toast
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          toast.push({
            title: "Failed",
            message: "We couldn't save. Try again.",
            variant: "danger",
          })
        }
      >
        Danger toast
      </Button>

      <Button type="button" variant="ghost" onClick={() => toast.clear()}>
        Clear
      </Button>
    </div>
  );
}
