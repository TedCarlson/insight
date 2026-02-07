"use client";

import { useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Result =
  | {
      ok: true;
      row_count_loaded: number;
      row_count_total: number;
      today: string;
      fulfillment_center_id: number;
      batch_id?: string | null;
    }
  | { ok: false; error: string; hint?: string; expected?: any; received?: any; detail?: any };

export function UploadShiftValidationCard({
  uploadEnabled,
  expectedFulfillmentCenterId,
  expectedFulfillmentCenterName,
}: {
  uploadEnabled: boolean;
  expectedFulfillmentCenterId: number | null;
  expectedFulfillmentCenterName: string | null;
}) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const canUpload = useMemo(() => Boolean(uploadEnabled && file && !busy), [uploadEnabled, file, busy]);

  function pickFile(f: File | null) {
    setFile(f);
    setResult(null);
  }

  function openFileDialog() {
    if (busy || !uploadEnabled) return;
    inputRef.current?.click();
  }

  async function onUpload() {
    if (!file || !uploadEnabled) return;
    setBusy(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/route-lock/shift-validation/upload", {
        method: "POST",
        body: fd,
      });

      const json = (await res.json().catch(() => null)) as Result | null;
      setResult(json ?? { ok: false, error: "invalid response" });

      if (res.ok) router.refresh();
    } catch (e: any) {
      setResult({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!busy && uploadEnabled) setDragActive(true);
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
    if (busy || !uploadEnabled) return;

    const dropped = e.dataTransfer?.files?.[0] ?? null;
    if (dropped) pickFile(dropped);
  }

  const fileLabel = file
    ? `${file.name}${typeof file.size === "number" ? ` (${Math.round(file.size / 1024)} KB)` : ""}`
    : "No file selected";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Hidden input used by both cards */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        disabled={busy || !uploadEnabled}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {/* Left card */}
      <Card>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">Upload customer Shift Validation (XLSX)</div>
            <div className="text-sm text-[var(--to-ink-muted)]">
              Parsed in-memory; no source material is stored. Rows from today onward replace the forward window.
            </div>
          </div>

          {/* Guardrail banner */}
          {!uploadEnabled ? (
            <div className="rounded-lg border border-[color:var(--to-border)] bg-black/5 px-3 py-2 text-sm">
              <div className="font-medium">Uploads disabled for this org</div>
              <div className="text-[var(--to-ink-muted)] text-xs mt-1">
                Set <span className="font-mono">public.pc_org.fulfillment_center_id</span> for the selected org to enable
                upload safeguards.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[color:var(--to-border)] bg-black/5 px-3 py-2 text-sm">
              <div className="font-medium">Upload safeguards enabled</div>
              <div className="text-[var(--to-ink-muted)] text-xs mt-1">
                Expected FC:{" "}
                <span className="font-medium">
                  {expectedFulfillmentCenterId ?? "—"}
                  {expectedFulfillmentCenterName ? ` · ${expectedFulfillmentCenterName}` : ""}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="h-9 px-3 text-xs" onClick={openFileDialog} disabled={busy || !uploadEnabled}>
              Choose file
            </Button>

            <div className="min-w-0 text-xs text-[var(--to-ink-muted)] truncate">{fileLabel}</div>
          </div>

          <Button variant="primary" className="h-10 w-full px-4 text-sm" disabled={!canUpload} onClick={onUpload}>
            {busy ? "Uploading…" : "Upload"}
          </Button>

          {result && (
            <div className="text-sm">
              {result.ok ? (
                <div className="space-y-1">
                  <div>
                    ✅ Loaded <span className="font-medium">{result.row_count_loaded}</span> / {result.row_count_total} rows
                  </div>
                  <div className="text-[var(--to-ink-muted)]">
                    Fulfillment Center ID: {result.fulfillment_center_id} · Forward window starts: {result.today}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-red-600">❌ {result.error}</div>
                  {result.hint && <div className="text-[var(--to-ink-muted)]">{result.hint}</div>}
                  {result.expected !== undefined && result.received !== undefined && (
                    <div className="text-[var(--to-ink-muted)]">
                      Expected: {String(result.expected)} · Received: {String(result.received)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Right card: drop zone */}
      <Card>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">Drag & drop</div>
            <div className="text-sm text-[var(--to-ink-muted)]">Drop an XLSX/XLS/CSV here, or click to browse.</div>
          </div>

          <div
            onClick={openFileDialog}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && uploadEnabled && !busy) openFileDialog();
            }}
            className={[
              "rounded-xl border border-dashed p-6 text-center select-none",
              "transition-colors",
              !uploadEnabled || busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              dragActive ? "border-[color:var(--to-border-strong)] bg-black/5" : "border-[color:var(--to-border)]",
            ].join(" ")}
          >
            <div className="text-sm font-medium">
              {!uploadEnabled ? "Org not configured for uploads" : dragActive ? "Drop to select file" : "Drop file here"}
            </div>
            <div className="mt-1 text-xs text-[var(--to-ink-muted)] truncate">{fileLabel}</div>
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            After selecting a file (drop or browse), use the Upload button on the left.
          </div>
        </div>
      </Card>
    </div>
  );
}