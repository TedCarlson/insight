import { Card } from "@/components/ui/Card";
import type { HomePayload } from "../lib/getHomePayload.server";

function BlockTitle(props: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {props.children}
    </div>
  );
}

function BlockSubtitle(props: { children: React.ReactNode }) {
  return <div className="mt-1 text-sm text-muted-foreground">{props.children}</div>;
}

function PlaceholderEventRow(props: {
  family: string;
  detail: string;
  when: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-background/60 px-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{props.family}</div>
        <div className="text-sm text-muted-foreground">{props.detail}</div>
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">{props.when}</div>
    </div>
  );
}

function SupportStat(props: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {props.title}
      </div>
      <div className="mt-1 text-2xl font-semibold leading-none">{props.value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{props.note}</div>
    </div>
  );
}

function PulseRow(props: {
  label: string;
  status: string;
  risk: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border bg-background/60 px-3 py-3">
      <div className="text-sm font-medium">{props.label}</div>
      <div className="text-sm text-muted-foreground">{props.status}</div>
      <div className="rounded-md border border-[var(--to-border)] bg-muted/10 px-2 py-1 text-xs font-medium">
        Risk: {props.risk}
      </div>
    </div>
  );
}

function ActionLink(props: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={props.href}
      className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
    >
      {props.label}
    </a>
  );
}

function UploadTile(props: {
  title: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 px-3 py-3">
      <div className="text-sm font-medium">{props.title}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Last: — <br />
        By: —
      </div>
    </div>
  );
}

export default function ManagerHomeWorkspace(props: {
  payload: HomePayload;
}) {
  const { payload } = props;

  const displayName = payload.full_name ?? "Manager";
  const orgLabel = payload.org_label ?? "No org selected";

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-1">
          <div className="text-xl font-semibold">Welcome, {displayName}</div>
          <div className="text-sm text-muted-foreground">
            Company Manager • {orgLabel}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <BlockTitle>Operational Feed</BlockTitle>
        <BlockSubtitle>
          Recent workspace events across leadership, dispatch, field activity, and uploads.
        </BlockSubtitle>

        <div className="mt-4 space-y-3">
          <PlaceholderEventRow
            family="Dispatch Console"
            detail="Most recent dispatch activity will appear here."
            when="Pending"
          />
          <PlaceholderEventRow
            family="Field Log"
            detail="Review queue and latest field events will appear here."
            when="Pending"
          />
          <PlaceholderEventRow
            family="Broadcast Center"
            detail="Manager broadcast items and org-wide notices will appear here."
            when="Pending"
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <BlockTitle>Org Pulse</BlockTitle>
          <BlockSubtitle>
            Primary KPI health and risk posture for the org.
          </BlockSubtitle>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SupportStat
              title="tNPS"
              value="—"
              note="Primary org pulse KPI will surface here."
            />
            <SupportStat
              title="FTR"
              value="—"
              note="Primary org pulse KPI will surface here."
            />
            <SupportStat
              title="Tool Usage"
              value="—"
              note="Primary org pulse KPI will surface here."
            />
          </div>
        </Card>

        <Card className="p-4">
          <BlockTitle>Office Pulse</BlockTitle>
          <BlockSubtitle>
            Quick health read across offices in your org.
          </BlockSubtitle>

          <div className="mt-4 space-y-3">
            <PulseRow label="Office 1" status="Pending" risk="—" />
            <PulseRow label="Office 2" status="Pending" risk="—" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <BlockTitle>Leadership Performance</BlockTitle>
          <BlockSubtitle>
            Leadership rollups, coaching posture, and comparative oversight.
          </BlockSubtitle>

          <div className="mt-4 grid gap-3">
            <SupportStat
              title="Leaders in Scope"
              value="—"
              note="Leadership rollup summary will surface here."
            />
          </div>
        </Card>

        <Card className="p-4">
          <BlockTitle>Broadcast Center</BlockTitle>
          <BlockSubtitle>
            Send directives and notices across the org.
          </BlockSubtitle>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Create Broadcast
            </button>
          </div>

          <div className="mt-4 rounded-xl border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
            Placeholder for future broadcast composition and audience targeting.
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <BlockTitle>Quick Actions</BlockTitle>
        <BlockSubtitle>
          Temporary bridges into legacy operational tools while the manager suite evolves.
        </BlockSubtitle>

        <div className="mt-4 flex flex-wrap gap-3">
          <ActionLink href="/roster" label="Open Team Roster" />
          <ActionLink href="/route-lock" label="Open Route Lock" />
          <ActionLink href="/metrics/uploads" label="Upload Metrics" />
        </div>
      </Card>

      <Card className="p-4">
        <BlockTitle>Upload Operations</BlockTitle>
        <BlockSubtitle>
          Smart upload library and recent upload activity for operational files.
        </BlockSubtitle>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <UploadTile title="Metrics Upload" />
          <UploadTile title="Shift Validation" />
          <UploadTile title="Check-In Upload" />
          <UploadTile title="Broadcast Assets" />
        </div>
      </Card>
    </div>
  );
}