"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ToolbarProps = {
  /** Controlled search value */
  searchValue?: string;
  /** Called on change */
  onSearchChange?: (value: string) => void;
  /** Placeholder for search input */
  searchPlaceholder?: string;

  /** Left side controls (filters, chips, toggles) */
  left?: React.ReactNode;

  /** Right side actions (Create, Export, etc.) */
  right?: React.ReactNode;

  /** Show built-in clear button */
  clearable?: boolean;

  className?: string;
};

export function Toolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  left,
  right,
  clearable = true,
  className,
}: ToolbarProps) {
  const hasSearch = typeof onSearchChange === "function";

  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {left ? <div className="flex flex-wrap items-center gap-2">{left}</div> : null}

        {hasSearch ? (
          <div className="flex w-full items-center gap-2 sm:max-w-md">
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9"
            />
            {clearable ? (
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3"
                onClick={() => onSearchChange("")}
                disabled={!searchValue}
                aria-label="Clear search"
              >
                Clear
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
