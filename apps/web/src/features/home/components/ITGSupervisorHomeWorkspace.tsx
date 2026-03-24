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

function ActionPlaceholderCard(props: {
    title: string;
    description: string;
    bullets: string[];
}) {
    return (
        <Card className="p-4">
            <BlockTitle>{props.title}</BlockTitle>
            <BlockSubtitle>{props.description}</BlockSubtitle>

            <div className="mt-4 space-y-2">
                {props.bullets.map((bullet) => (
                    <div
                        key={bullet}
                        className="rounded-xl border bg-background/60 px-3 py-3 text-sm text-muted-foreground"
                    >
                        {bullet}
                    </div>
                ))}
            </div>
        </Card>
    );
}

function UploadFamilyRow(props: {
    family: string;
    status: string;
    lastRun: string;
    actor: string;
}) {
    return (
        <div className="grid gap-3 rounded-xl border bg-background/60 px-3 py-3 md:grid-cols-[1.3fr_.8fr_.9fr_.9fr]">
            <div>
                <div className="text-sm font-medium">{props.family}</div>
            </div>
            <div className="text-sm text-muted-foreground">{props.status}</div>
            <div className="text-sm text-muted-foreground">{props.lastRun}</div>
            <div className="text-sm text-muted-foreground">{props.actor}</div>
        </div>
    );
}

export default function ITGSupervisorHomeWorkspace(props: {
    payload: HomePayload;
}) {
    const { payload } = props;

    const displayName = payload.full_name ?? "Supervisor";
    const orgLabel = payload.org_label ?? "No org selected";

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <div className="space-y-1">
                    <div className="text-xl font-semibold">Welcome, {displayName}</div>
                    <div className="text-sm text-muted-foreground">
                        ITG Supervisor • {orgLabel}
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <BlockTitle>Operational Feed</BlockTitle>
                <BlockSubtitle>
                    Recent workspace events across dispatch, field activity, and uploads.
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
                        family="Workspace Bulletin"
                        detail="Supervisor and manager broadcast items will appear here."
                        when="Pending"
                    />
                </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card className="p-4">
                    <BlockTitle>Dispatch Support</BlockTitle>
                    <BlockSubtitle>
                        Live operational support surface for regional dispatch activity.
                    </BlockSubtitle>

                    <div className="mt-4 grid gap-3">
                        <SupportStat
                            title="Latest Update"
                            value="—"
                            note="Most recent dispatch log event will surface here."
                        />
                    </div>
                </Card>

                <Card className="p-4">
                    <BlockTitle>Field Log Support</BlockTitle>
                    <BlockSubtitle>
                        Review queue and field activity checkpoints for your territory.
                    </BlockSubtitle>

                    <div className="mt-4 grid gap-3">
                        <SupportStat
                            title="Review Queue"
                            value="—"
                            note="Pending field-log review workload will surface here."
                        />
                    </div>
                </Card>

            </div>

            <Card className="p-4">
                <BlockTitle>Quick Actions</BlockTitle>
                <BlockSubtitle>
                    Jump directly into core operational surfaces.
                </BlockSubtitle>

                <div className="mt-4 flex flex-wrap gap-3">
                    <a
                        href="/route-lock"
                        className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                    >
                        Open Route Lock
                    </a>

                    <a
                        href="/metrics/uploads"
                        className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                    >
                        Upload Metrics
                    </a>
                </div>
            </Card>

            <Card className="p-4">
                <BlockTitle>Upload Operations</BlockTitle>
                <BlockSubtitle>
                    Smart upload library and recent upload activity for operational files.
                </BlockSubtitle>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border bg-background/60 px-3 py-3">
                        <div className="text-sm font-medium">Metrics Upload</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Last: — <br />
                            By: —
                        </div>
                    </div>

                    <div className="rounded-xl border bg-background/60 px-3 py-3">
                        <div className="text-sm font-medium">Shift Validation</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Last: — <br />
                            By: —
                        </div>
                    </div>

                    <div className="rounded-xl border bg-background/60 px-3 py-3">
                        <div className="text-sm font-medium">Check-In Upload</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Last: — <br />
                            By: —
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}