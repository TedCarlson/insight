"use client";

import type { EdgePermissionsGridRow, EdgePermissionKey } from "../types";
import { useState } from "react";

function CopyButton(props: { value: string }) {
  const { value } = props;
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="ml-2 rounded border px-2 py-0.5 text-[11px] font-medium disabled:opacity-60"
      style={{ borderColor: "var(--to-border)" }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 900);
        } catch {
          // no-op; clipboard may be blocked in some contexts
        }
      }}
      aria-label="Copy UUID"
      title="Copy UUID"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function EdgePermissionsTable(props: {
  rows: EdgePermissionsGridRow[];
  permissionKeys: EdgePermissionKey[];
  onToggle: (args: { authUserId: string; permissionKey: EdgePermissionKey; enabled: boolean }) => void;
}) {
  const { rows, permissionKeys, onToggle } = props;

  return (
    <div
      className="overflow-auto rounded border"
      style={{
        borderColor: "var(--to-border)",
        background: "var(--to-surface)",
      }}
    >
      <table className="min-w-[980px] w-full border-collapse text-sm table-fixed">
        <thead className="sticky top-0 z-10 bg-[var(--to-surface)]">
          <tr className="border-b" style={{ borderColor: "var(--to-border)" }}>
            {/* Sticky first column */}
            <th
              className="px-3 py-2 text-left font-medium"
              style={{
                position: "sticky",
                left: 0,
                zIndex: 20,
                background: "var(--to-surface)",
                borderRight: "1px solid var(--to-border)",
                minWidth: 250,
              }}
            >
              User
            </th>

            <th className="px-3 py-2 text-left font-medium" style={{ minWidth: 260 }}>
              Email
            </th>

            {permissionKeys.map((k) => (
              <th
                key={k}
                className="px-2 py-2 text-center font-medium whitespace-nowrap"
                style={{ minWidth: 120 }}
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => {
            const zebra = idx % 2 !== 0;
            const rowBg = zebra ? "var(--to-surface-2)" : "transparent";

            const hasDisplay = !!(r.user.fullName || r.user.email);

            return (
              <tr key={r.user.authUserId} style={{ background: rowBg }}>
                {/* Sticky first column cell */}
                <td
                  className="px-2 py-2 align-top"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 5,
                    background: rowBg === "transparent" ? "var(--to-surface)" : rowBg,
                    borderRight: "1px solid var(--to-border)",
                  }}
                >
                  {r.user.fullName ? (
                    <div className="font-medium">{r.user.fullName}</div>
                  ) : (
                    <div className="font-medium text-[var(--to-ink-muted)]">
                      {hasDisplay ? "—" : "UNLINKED PROFILE"}
                    </div>
                  )}

                  <div
                    className="mt-0.5 text-xs text-[var(--to-ink-muted)]"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto auto",
                      alignItems: "center",
                      columnGap: 8,
                    }}
                  >
                    <div className="min-w-0" style={{ maxWidth: 280 }}>
                      <span className="shrink-0">{r.user.status ? `${r.user.status} • ` : ""}</span>
                      <span
                        className="font-mono truncate"
                        title={r.user.authUserId}
                        style={{ display: "inline-block", maxWidth: "100%" }}
                      >
                        {r.user.authUserId}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CopyButton value={r.user.authUserId} />
                    </div>
                  </div>
                </td>

               <td className="px-3 py-2 align-top text-[var(--to-ink-muted)]">
                  {r.user.email ? (
                    <span className="block truncate" title={r.user.email}>
                      {r.user.email}
                    </span>
                  ) : (
                    <span className="block truncate font-mono text-xs" title={r.user.authUserId}>
                      {r.user.authUserId}
                    </span>
                  )}
                </td>

                {permissionKeys.map((k) => {
                  const enabled = !!r.grants[k];

                  return (
                    <td key={k} className="px-2 py-2 text-center align-top">
                      <button
                        onClick={() => onToggle({ authUserId: r.user.authUserId, permissionKey: k, enabled: !enabled })}
                        className="h-7 w-11 rounded border text-[11px] font-semibold"
                        style={{
                          borderColor: "var(--to-border)",
                          background: enabled ? "rgba(16,185,129,0.14)" : "transparent",
                        }}
                        aria-pressed={enabled}
                      >
                        {enabled ? "ON" : "OFF"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}