// apps/web/src/app/dev/kit/page.tsx
import type { ReactNode } from "react";

import ThemePreview from "./ThemePreview";
import SegmentedDemo from "./SegmentedDemo";
import ModalDemo from "./ModalDemo";
import ToastDemo from "./ToastDemo";
import PaginationDemo from "./PaginationDemo";
import EmptyStateDemo from "./EmptyStateDemo";
import BreadcrumbsDemo from "./BreadcrumbsDemo";
import ConfirmDialogDemo from "./ConfirmDialogDemo";
import TooltipDemo from "./TooltipDemo";
import KitConsole from "./KitConsole";
import VariantsPlayground from "./VariantsPlayground";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Toolbar } from "@/components/ui/Toolbar";
import { ToastProvider } from "@/components/ui/Toast";
import { Notice } from "@/components/ui/Notice";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
} from "@/components/ui/DataTable";

function Section({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <Card id={id}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {desc ? <p className="text-sm text-[var(--to-ink-muted)]">{desc}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export default function KitPage() {
  const sections = [
    { id: "variants", label: "Variants" },
    { id: "breadcrumbs", label: "Breadcrumbs" },
    { id: "segmented", label: "Segmented" },
    { id: "modal", label: "Modal" },
    { id: "confirm", label: "Confirm dialog" },
    { id: "toasts", label: "Toasts + notices" },
    { id: "toolbar", label: "Toolbar" },
    { id: "tooltip", label: "Tooltip" },
    { id: "pagination", label: "Pagination" },
    { id: "empty", label: "Empty state" },
    { id: "table", label: "Table / list row" },
  ];


  return (
    <ToastProvider>
      <ThemePreview>
        <PageShell>
          <PageHeader
            title="UI Kit"
            subtitle="Source of truth for app surfaces. Use primitives + patterns to avoid drift."
          />

          <KitConsole sections={sections} />

          <Section id="variants"
            title="Variants playground"
            desc="Use these to make pages feel different without inventing new styles. Use the console to pick a variant and highlight it."
          >
            <VariantsPlayground />
          </Section>


                    <Section id="breadcrumbs" title="Breadcrumbs" desc="Use for hierarchy + navigation context at the top of a page.">
            <BreadcrumbsDemo />
          </Section>

          <Section id="segmented" title="Tabs / segmented control">
            <SegmentedDemo />
          </Section>

          <Section id="modal" title="Modal">
            <ModalDemo />
          </Section>


          <Section
            id="confirm"
            title="Confirm dialog"
            desc="Use for destructive/irreversible actions (delete, reset, archive)."
          >
            <ConfirmDialogDemo />
          </Section>

          <Section id="toasts" title="Toasts + inline notices">
            <div className="space-y-3">
              <ToastDemo />
              <div className="grid gap-3 md:grid-cols-2">
                <Notice title="Info" variant="info">
                  Low-contrast inline notice for guidance. Keep it calm.
                </Notice>
                <Notice title="Warning" variant="warning">
                  Use sparingly. Only when action is required.
                </Notice>
              </div>
            </div>
          </Section>

          <Section id="toolbar" title="Toolbar">
            <Toolbar
              left={
                <>
                  <div className="w-full sm:w-72">
                    <TextInput placeholder="Search…" />
                  </div>
                  <div className="w-full sm:w-44">
                    <Select defaultValue="week" aria-label="Range">
                      <option value="today">Today</option>
                      <option value="week">This week</option>
                      <option value="month">This month</option>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Open", "Locked"].map((t, i) => (
                      <Pill key={t} active={i === 0}>
                        {t}
                      </Pill>
                    ))}
                  </div>
                </>
              }
              right={
                <>
                  <Button type="button" variant="secondary">
                    Export
                  </Button>
                  <Button type="button" variant="primary">
                    New
                  </Button>
                </>
              }
            />
          </Section>

          <Section
            id="tooltip"
            title="Tooltip"
            desc="For dense actions: IconButton, toolbar affordances, table row controls."
          >
            <TooltipDemo />
          </Section>


          <Section id="pagination" title="Pagination + table footer">
            <PaginationDemo />
          </Section>

          <Section id="empty" title="Empty state" desc="Use this anytime a page has zero records.">
            <EmptyStateDemo />
          </Section>

          <Section id="table" title="Table / list row (pattern)" desc="Zebra rows + hover are enabled here.">
            <DataTable zebra hover>
              <DataTableHeader>
                <div className="col-span-4">Name</div>
                <div className="col-span-4">Role</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Action</div>
              </DataTableHeader>

              <DataTableBody zebra>
                {[
                  { name: "Alex Rivera", role: "Driver", status: "Active" },
                  { name: "Jordan Kim", role: "Dispatcher", status: "Active" },
                  { name: "Sam Patel", role: "Driver", status: "Pending" },
                ].map((r) => (
                  <DataTableRow key={r.name} hover>
                    <div className="col-span-4 font-medium">{r.name}</div>
                    <div className="col-span-4 text-[var(--to-ink-muted)]">{r.role}</div>
                    <div className="col-span-2">
                      <Badge variant={r.status === "Active" ? "success" : "warning"}>{r.status}</Badge>
                    </div>
                    <div className="col-span-2 text-right">
                      <Button type="button" variant="secondary" className="px-2 py-1 text-xs">
                        View
                      </Button>
                    </div>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </Section>
        </PageShell>
      </ThemePreview>
    </ToastProvider>
  );
}
