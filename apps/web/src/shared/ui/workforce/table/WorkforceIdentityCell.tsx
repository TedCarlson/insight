import type { WorkforceIdentityCellProps } from "./workforceTable.types";

function regionPodiumClass(rank: number | null | undefined) {
  if (rank === 1) {
    return "border-[#d4af37] bg-[color-mix(in_oklab,#d4af37_16%,white)] text-[#8a6a00]";
  }
  if (rank === 2) {
    return "border-[#aeb7c2] bg-[color-mix(in_oklab,#aeb7c2_18%,white)] text-[#556270]";
  }
  if (rank === 3) {
    return "border-[#b87333] bg-[color-mix(in_oklab,#b87333_16%,white)] text-[#7a4a1d]";
  }
  return "border-[var(--to-border)] bg-transparent text-muted-foreground";
}

export default function WorkforceIdentityCell({
  row,
}: WorkforceIdentityCellProps) {
  const region = row.rank_context?.region ?? null;
  const team = row.rank_context?.team ?? null;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm font-semibold leading-tight">
        {row.full_name}
      </div>

      <div className="flex items-center gap-3 text-[10px] leading-tight">
        <span
          className={[
            "inline-flex items-center rounded-md border px-1.5 py-[2px]",
            regionPodiumClass(region?.rank),
          ].join(" ")}
          title={
            region
              ? `Region rank ${region.rank} of ${region.population}`
              : "Region rank unavailable"
          }
        >
          Region {region ? `#${region.rank}/${region.population}` : "—"}
        </span>

        <span className="text-muted-foreground">
          Team {team ? `#${team.rank}/${team.population}` : "—"}
        </span>
      </div>
    </div>
  );
}