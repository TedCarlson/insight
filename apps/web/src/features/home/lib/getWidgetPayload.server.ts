// apps/web/src/features/home/lib/getWidgetPayload.server.ts

export async function getWidgetPayload() {
  return {
    pulse: {
      org: {
        tnps: { value: null, display: "—", note: "" },
        ftr: { value: null, display: "—", note: "" },
        toolUsage: { value: null, display: "—", note: "" },
      },
      offices: [],
    },
    supervisorPulse: {
      rows: [],
    },
    feed: {
      items: [],
    },
    uploads: {
      items: [],
    },
    broadcast: {
      reach: {
        reachChip: null,
        activeBroadcast: "—",
        audience: "—",
        seen: "—",
        unread: "—",
      },
    },
  };
}

export async function getFeedWidgetPayload() {
  return [];
}