// path: apps/web/src/shared/surfaces/MetricsDrilldowns.tsx

"use client";

import { useState } from "react";

type PanelKey = "work_mix" | "parity";

type Props = {
  showWorkMix?: boolean;
  showParity?: boolean;

  workMixTitle?: string;
  workMixHelper?: string;
  workMixContent?: React.ReactNode;

  parityTitle?: string;
  parityHelper?: string;
  parityContent?: React.ReactNode;
};

function Overlay(props: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { title, onClose, children } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12">
      <div className="max-h-[85vh] w-full max-w-7xl overflow-auto rounded-2xl border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function TriggerButton(props: {
  label: string;
  helper: string;
  onClick: () => void;
}) {
  const { label, helper, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition hover:bg-muted/20"
    >
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{helper}</div>
      </div>

      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm text-muted-foreground">
        i
      </div>
    </button>
  );
}

export default function MetricsDrilldowns({
  showWorkMix = true,
  showParity = true,

  workMixTitle = "Work Mix",
  workMixHelper = "Open work mix distribution overlay",
  workMixContent,

  parityTitle = "Parity",
  parityHelper = "Open contractor parity overlay",
  parityContent,
}: Props) {
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);

  const showAny = showWorkMix || showParity;
  if (!showAny) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {showWorkMix ? (
          <TriggerButton
            label={workMixTitle}
            helper={workMixHelper}
            onClick={() => setOpenPanel("work_mix")}
          />
        ) : null}

        {showParity ? (
          <TriggerButton
            label={parityTitle}
            helper={parityHelper}
            onClick={() => setOpenPanel("parity")}
          />
        ) : null}
      </div>

      {openPanel === "work_mix" ? (
        <Overlay title={workMixTitle} onClose={() => setOpenPanel(null)}>
          {workMixContent}
        </Overlay>
      ) : null}

      {openPanel === "parity" ? (
        <Overlay title={parityTitle} onClose={() => setOpenPanel(null)}>
          {parityContent}
        </Overlay>
      ) : null}
    </>
  );
}