"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

import { useKitConsoleState } from "./KitConsole";

function SelectedBadge() {
  return (
    <span className="ml-2 inline-flex">
      <Badge variant="info">Selected</Badge>
    </span>
  );
}

export default function VariantsPlayground() {
  const { state } = useKitConsoleState();

  const selectedVariant = state.cardVariant;
  const selectedButton = state.buttonVariant;

  return (
    <div className="to-grid-3">
      <Card className={selectedVariant === "default" ? "to-ring" : ""}>
        <div className="flex items-center">
          <div className="text-sm font-semibold">
            Card: default
            {selectedVariant === "default" ? <SelectedBadge /> : null}
          </div>
        </div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">Border only (no surface).</div>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant={selectedButton}>
            {selectedButton}
          </Button>
          <Button type="button" variant="secondary">
            Secondary
          </Button>
        </div>
      </Card>

      <Card variant="subtle" className={selectedVariant === "subtle" ? "to-ring" : ""}>
        <div className="flex items-center">
          <div className="text-sm font-semibold">
            Card: subtle
            {selectedVariant === "subtle" ? <SelectedBadge /> : null}
          </div>
        </div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">Surface fill.</div>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant={selectedButton}>
            {selectedButton}
          </Button>
          <Button type="button" variant="ghost">
            Ghost
          </Button>
        </div>
      </Card>

      <Card variant="elevated" className={selectedVariant === "elevated" ? "to-ring" : ""}>
        <div className="flex items-center">
          <div className="text-sm font-semibold">
            Card: elevated
            {selectedVariant === "elevated" ? <SelectedBadge /> : null}
          </div>
        </div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">Surface + shadow.</div>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant={selectedButton}>
            {selectedButton}
          </Button>
          <Button type="button" variant="secondary">
            Secondary
          </Button>
        </div>
      </Card>
    </div>
  );
}
