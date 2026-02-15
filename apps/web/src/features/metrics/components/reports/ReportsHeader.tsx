"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";

type Props = {
  title: string;
  subtitle: string;
  onOpenRubric: () => void;
};

export default function ReportsHeader({
  title,
  subtitle,
  onOpenRubric,
}: Props) {
  return (
    <Card variant="subtle">
      <Toolbar
        left={
          <div className="min-w-0 flex items-center gap-2">
            <Link
              href="/metrics"
              className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
            >
              Back
            </Link>

            <span className="px-2 text-[var(--to-ink-muted)]">•</span>

            <div className="min-w-0">
              <div className="text-sm font-semibold leading-5">
                {title}
              </div>
              <div className="text-[11px] text-[var(--to-ink-muted)] leading-4">
                {subtitle}
              </div>
            </div>
          </div>
        }
        right={
          <button
            type="button"
            onClick={onOpenRubric}
            className="to-btn to-btn--secondary h-8 px-3 text-xs"
          >
            Rubric
          </button>
        }
      />
    </Card>
  );
}