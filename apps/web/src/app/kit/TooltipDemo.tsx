// apps/web/src/app/kit/TooltipDemo.tsx
"use client";

import { Tooltip } from "@/components/ui/Tooltip";
import { IconButton } from "@/components/ui/IconButton";
import { Toolbar } from "@/components/ui/Toolbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function TooltipDemo() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-[var(--to-ink-muted)]">
        Tooltips pair best with dense toolbars + icon actions.
      </div>

      <Card>
        <Toolbar
          left={
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip content="Filters" side="bottom">
                <IconButton aria-label="Filters" icon={<span aria-hidden>🔎</span>} />
              </Tooltip>
              <Tooltip content="Sort" side="bottom">
                <IconButton aria-label="Sort" icon={<span aria-hidden>↕️</span>} />
              </Tooltip>
              <Tooltip content="Refresh" side="bottom">
                <IconButton aria-label="Refresh" icon={<span aria-hidden>🔄</span>} />
              </Tooltip>
              <Tooltip content="Settings" side="bottom">
                <IconButton aria-label="Settings" icon={<span aria-hidden>⚙️</span>} />
              </Tooltip>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <Tooltip content="Export CSV" side="bottom" align="end">
                <Button type="button" variant="secondary">
                  Export
                </Button>
              </Tooltip>
              <Tooltip content="Create a new item" side="bottom" align="end">
                <Button type="button" variant="primary">
                  New
                </Button>
              </Tooltip>
            </div>
          }
        />
      </Card>

      <div className="flex flex-wrap gap-3">
        <Tooltip content="Top / start" side="top" align="start">
          <Button type="button" variant="secondary">
            Hover me
          </Button>
        </Tooltip>

        <Tooltip content="Top / center" side="top" align="center">
          <Button type="button" variant="secondary">
            Hover me
          </Button>
        </Tooltip>

        <Tooltip content="Top / end" side="top" align="end">
          <Button type="button" variant="secondary">
            Hover me
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
