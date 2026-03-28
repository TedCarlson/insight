"use client";

import BpWorkMixCard from "@/features/bp-view/components/BpWorkMixCard";
import type { BpWorkMix } from "@/features/bp-view/lib/bpView.types";

export type CompanyManagerViewMode = "OFFICE" | "LEADERSHIP" | "WORKFORCE";
export type CompanyManagerSegment = "ALL" | "ITG" | "BP";

function Chip(props: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "rounded-xl border px-3 py-2 text-xs font-medium transition active:scale-[0.98]",
        props.active
          ? "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)] text-foreground"
          : "bg-background text-muted-foreground hover:bg-muted/30",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

export default function CompanyManagerControlBar(props: {
  workMix: BpWorkMix;
  viewMode: CompanyManagerViewMode;
  onViewModeChange: (next: CompanyManagerViewMode) => void;
  segment: CompanyManagerSegment;
  onSegmentChange: (next: CompanyManagerSegment) => void;
  contractorOptions: string[];
  contractor: string;
  onContractorChange: (next: string) => void;
}) {
  const {
    workMix,
    viewMode,
    onViewModeChange,
    segment,
    onSegmentChange,
    contractorOptions,
    contractor,
    onContractorChange,
  } = props;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr] lg:items-end">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              View
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="Office"
                active={viewMode === "OFFICE"}
                onClick={() => onViewModeChange("OFFICE")}
              />
              <Chip
                label="Leadership"
                active={viewMode === "LEADERSHIP"}
                onClick={() => onViewModeChange("LEADERSHIP")}
              />
              <Chip
                label="Workforce"
                active={viewMode === "WORKFORCE"}
                onClick={() => onViewModeChange("WORKFORCE")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Segment
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="All"
                active={segment === "ALL"}
                onClick={() => onSegmentChange("ALL")}
              />
              <Chip
                label="ITG"
                active={segment === "ITG"}
                onClick={() => onSegmentChange("ITG")}
              />
              <Chip
                label="BP"
                active={segment === "BP"}
                onClick={() => onSegmentChange("BP")}
              />
            </div>
          </div>

          {segment === "BP" && contractorOptions.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Contractor
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="All BP"
                  active={contractor === "ALL"}
                  onClick={() => onContractorChange("ALL")}
                />
                {contractorOptions.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    active={contractor === option}
                    onClick={() => onContractorChange(option)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>

        <div className="min-w-0 xl:w-[520px]">
          <BpWorkMixCard workMix={workMix} />
        </div>
      </div>
    </div>
  );
}