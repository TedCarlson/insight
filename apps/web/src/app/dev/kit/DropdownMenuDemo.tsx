// apps/web/src/app/dev/kit/DropdownMenuDemo.tsx
"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/DropdownMenu";
import { Toolbar } from "@/components/ui/Toolbar";

export default function DropdownMenuDemo() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-[var(--to-ink-muted)]">
        Use DropdownMenu for toolbar actions, filters, and row menus. Keyboard: Enter/Space/↓ opens, Esc closes.
      </div>

      <Card>
        <Toolbar
          left={
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu
                trigger={
                  <Button type="button" variant="secondary">
                    Actions <span aria-hidden>▾</span>
                  </Button>
                }
              >
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => {}}>New dashboard</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {}}>Import data…</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => {}}>Settings</DropdownMenuItem>
                <DropdownMenuItem tone="danger" onSelect={() => {}}>
                  Delete workspace…
                </DropdownMenuItem>
              </DropdownMenu>

              <DropdownMenu
                trigger={
                  <IconButton aria-label="More" icon={<span aria-hidden>⋯</span>} />
                }
                align="end"
              >
                <DropdownMenuItem onSelect={() => {}}>Duplicate</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {}}>Move to…</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem keepOpen onSelect={() => {}}>
                  Keep open (demo)
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <Button type="button" variant="primary">
                Save
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}
