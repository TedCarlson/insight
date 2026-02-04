"use client";

import { useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type StageOk = {
  ok: true;
  mode: "today" | "date";
  fiscal_end_date: string; // YYYY-MM-DD
  detected_generated_at?: string | null; // ISO or null
  detected_title?: string | null;
  row_count_total: number;
  warning_flags: any[];
  batch_id: string;
};

type LoadOk = {
  ok: true;
  loaded: true;
  row_count_loaded: number;
  batch_id: string;
  fiscal_end_date: string;
  warning_flags: any[];
};

type ApiErr = { ok: false; error: string; hint?: string; detail?: any };

type Result = StageOk | LoadOk | ApiErr;

function isoTodayNY(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function UploadMetricsCard({
  orgId,
  orgSelectable = true,
}: {
  orgId: string;
  orgSelectable?: boolean;
}) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [pickedDate, setPickedDate] = useState<string>(isoTodayNY());

  const inputRef = useRef<HTMLInputElement | null>(null);

  const staged = Boolean(result && (result as any).ok && (result as any).batch_id && !(result as any).loaded);
  const stagedBatchId = staged ? (result as any).batch_id : null;

  const canStage = useMemo(() => Boolean(file && !busy), [file, busy]);
  const canLoad = useMemo(() => Boolean(stagedBatchId && file && !busy), [stagedBatchId, file, busy]);

  function pickFile(f: File | null) {
    setFile(f);
    setResult(null);
  }

  function openFileDialog() {
    if (busy) return;
    inputRef.current?.click();
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragActive(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (busy) return;

    const dropped = e.dataTransfer?.files?.[0] ?? null;
    if (dropped) pickFile(dropped);
  }

  const fileLabel = file
    ? `${file.name}${typeof file.size === "number" ? ` (${Math.round(file.size / 1024)} KB)` : ""}`
    : "No file selected";

  async function post(form: FormData) {
    const res = await fetch("/api/metrics/upload", { method: "POST", body: form });
    const json = (await res.json().catch(() => null)) as Result | null;
    return { res, json: json ?? { ok: false, error: "invalid response" } };
  }

  async function onStageVerify() {
    if (!file) return;
    setBusy(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", "date");
      fd.append("picked_date", pickedDate);

      const { res, json } = await post(fd);
      setResult(json);
      if (res.ok) router.refresh();
    } catch (e: any) {
      setResult({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

 async function onConfirmLoad() {
    if (!file || !stagedBatchId) return;
    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", "date");
      fd.append("picked_date", pickedDate);
      fd.append("confirm", "1");
      fd.append("batch_id", stagedBatchId);

      const { res, json } = await post(fd);
      setResult(json);
      if (res.ok) router.refresh();
    } catch (e: any) {
      setResult({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveLastBatch() {
    if (busy) return;
    const ok = window.confirm("Remove the most recent Metrics batch for this org? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/metrics/remove-last-batch", { method: "POST" });
      const json = await res.json().catch(() => null);
      setResult(json ?? { ok: false, error: "invalid response" });
      if (res.ok) router.refresh();
    } catch (e: any) {
      setResult({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }
  const stageOk = result && (result as any).ok && !(result as any).loaded ? (result as StageOk) : null;
  const loadOk = result && (result as any).ok && (result as any).loaded ? (result as LoadOk) : null;
  const err = result && !(result as any).ok ? (result as ApiErr) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        disabled={busy}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      <Card className="h-full">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">Upload Metrics (XLSX)</div>
            <div className="text-sm text-[var(--to-ink-muted)]">
              Stage & verify first (warnings only), then confirm load into the raw bucket.
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--to-border)] px-3 py-2">
            <div className="text-sm font-medium">Fiscal month anchor date</div>

            <div className="mt-2 flex items-center gap-3">
              <input
                type="date"
                value={pickedDate}
                disabled={busy}
                onChange={(e) => setPickedDate(e.target.value)}
                className="h-9 w-[160px] rounded-md border border-[color:var(--to-border)] bg-transparent px-2 text-xs"
              />
              <div className="text-xs text-[var(--to-ink-muted)]">
                Default is today. Adjust for report lag (2–3 days) or intentional prior fiscal month selection.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                className="h-10 px-4 text-sm flex-1 min-w-[180px] hover:brightness-125 active:brightness-110"
                disabled={!canStage}
                onClick={onStageVerify}
              >
                {busy ? "Working…" : "Stage & verify"}
              </Button>

              <Button
                variant="secondary"
                className={[
                  "h-10 px-4 text-sm flex-1 min-w-[180px]",
                  "bg-emerald-600 text-white border-emerald-700",
                  "hover:bg-emerald-700 hover:border-emerald-800 hover:brightness-125",
                  "active:bg-emerald-800",
                  "disabled:opacity-60",
                ].join(" ")}
                disabled={!canLoad}
                onClick={onConfirmLoad}
              >
                {busy ? "Working…" : "Confirm & load"}
              </Button>

              <Button
                variant="ghost"
                className={[
                  "h-10 px-4 text-sm flex-1 min-w-[180px]",
                  "border border-orange-500 text-orange-700",
                  "hover:bg-orange-50 hover:border-orange-600 hover:text-orange-800 hover:brightness-125",
                  "active:bg-orange-100",
                  "disabled:opacity-60",
                ].join(" ")}
                disabled={busy}
                onClick={onRemoveLastBatch}
              >
                Remove last batch
              </Button>
            </div>
          </div>
          
          {stageOk && (
            <div className="text-sm space-y-1">
              <div>
                ✅ Staged <span className="font-medium">{stageOk.row_count_total}</span> rows · Fiscal end date:{" "}
                <span className="font-mono">{stageOk.fiscal_end_date}</span>
              </div>
              {stageOk.detected_title ? (
                <div className="text-[var(--to-ink-muted)] text-xs truncate">File: {stageOk.detected_title}</div>
              ) : null}
              {Array.isArray(stageOk.warning_flags) && stageOk.warning_flags.length > 0 ? (
                <div className="text-[var(--to-ink-muted)] text-xs">
                  Warnings: <span className="font-medium">{stageOk.warning_flags.length}</span> (informational)
                </div>
              ) : (
                <div className="text-[var(--to-ink-muted)] text-xs">Warnings: none</div>
              )}
            </div>
          )}

          {loadOk && (
            <div className="text-sm space-y-1">
              <div>
                ✅ Loaded <span className="font-medium">{loadOk.row_count_loaded}</span> rows · Fiscal end date:{" "}
                <span className="font-mono">{loadOk.fiscal_end_date}</span>
              </div>
            </div>
          )}

          {err && (
            <div className="text-sm space-y-1">
              <div className="text-red-600">❌ {err.error}</div>
              {err.hint ? <div className="text-[var(--to-ink-muted)] text-xs">{err.hint}</div> : null}
            </div>
          )}
        </div>
      </Card>

      <Card className="h-full">
        <div className="flex h-full flex-col gap-3">
          <div>
            <div className="text-sm font-medium">Drop zone</div>
            <div className="text-sm text-[var(--to-ink-muted)]">
              Drop an XLSX/XLS/CSV here, or click anywhere in the box to browse.
            </div>
          </div>

          <div
            onClick={openFileDialog}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !busy) openFileDialog();
            }}
            className={[
              "rounded-xl border border-dashed select-none",
              "transition-colors",
              "flex flex-col items-center justify-center text-center",
              "flex-1 w-full",
              busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              dragActive ? "border-[color:var(--to-border-strong)] bg-black/5" : "border-[color:var(--to-border)]",
            ].join(" ")}
          >
            <div className="text-sm font-medium">{dragActive ? "Drop to select file" : "Click or drop file"}</div>
            <div className="mt-1 text-xs text-[var(--to-ink-muted)] truncate max-w-[90%]">{fileLabel}</div>
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            After selecting a file, run “Stage & verify” to line up the fiscal month container, then “Confirm & load”.
          </div>
        </div>
      </Card>
    </div>
  );
}