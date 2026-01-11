import { fetchRoster, fetchRosterFilterOptions } from "@/lib/roster/query";
import type { RosterFilters } from "@/lib/roster/types";
import RosterClient from "@/components/roster/RosterClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(p: Record<string, any>, key: string) {
  const v = p[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function RosterPage({ searchParams }: Props) {
  const sp = await searchParams;

  const filters: RosterFilters = {
    q: getParam(sp, "q"),
    active: (getParam(sp, "active") as any) ?? "1",
    hasTech: (getParam(sp, "hasTech") as any) ?? "0",
    mso: getParam(sp, "mso"),
    contractor: getParam(sp, "contractor"),
    limit: (getParam(sp, "limit") as any) ?? "50",
    offset: (getParam(sp, "offset") as any) ?? "0",
  };

  const [data, options] = await Promise.all([fetchRoster(filters), fetchRosterFilterOptions()]);

  return (
    <div className="p-4 space-y-4">
      <RosterClient
        initialRows={data.rows}
        initialCount={data.count}
        initialLimit={data.limit}
        initialOffset={data.offset}
        options={options}
        initialFilters={filters}
      />
    </div>
  );
}
