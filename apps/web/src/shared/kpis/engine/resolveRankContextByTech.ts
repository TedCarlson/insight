import type {
  RankContextByPerson,
  RankInputRow,
  RankResolverConfig,
  RankScope,
  RankSeat,
} from "@/shared/kpis/contracts/rankTypes";

function numDesc(a: number | null, b: number | null) {
  const av = a ?? -Infinity;
  const bv = b ?? -Infinity;
  return bv - av;
}

function numAsc(a: number | null, b: number | null) {
  const av = a ?? Infinity;
  const bv = b ?? Infinity;
  return av - bv;
}

function compareRows(a: RankInputRow, b: RankInputRow) {
  const c1 = numDesc(a.composite_score, b.composite_score);
  if (c1 !== 0) return c1;

  const direction =
    a.tiebreak_direction ?? b.tiebreak_direction ?? "HIGHER_BETTER";

  const c2 =
    direction === "LOWER_BETTER"
      ? numAsc(a.tiebreak_value, b.tiebreak_value)
      : numDesc(a.tiebreak_value, b.tiebreak_value);

  if (c2 !== 0) return c2;

  const c3 = numDesc(a.total_jobs, b.total_jobs);
  if (c3 !== 0) return c3;

  const c4 = numAsc(a.risk_flags, b.risk_flags);
  if (c4 !== 0) return c4;

  // true tie
  return 0;
}

function rankBucket(rows: RankInputRow[]) {
  const sorted = [...rows].sort((a, b) => {
    const cmp = compareRows(a, b);
    if (cmp !== 0) return cmp;

    // stable display only; does NOT affect assigned rank
    return a.person_id.localeCompare(b.person_id);
  });

  const out = new Map<string, RankSeat>();

  let previousRow: RankInputRow | null = null;
  let currentRank = 0;

  sorted.forEach((row, i) => {
    if (previousRow == null) {
      currentRank = 1;
    } else if (compareRows(previousRow, row) !== 0) {
      currentRank = i + 1;
    }

    out.set(row.person_id, {
      rank: currentRank,
      population: sorted.length,
    });

    previousRow = row;
  });

  return out;
}

function getScopeKey(row: RankInputRow, scope: RankScope) {
  if (scope === "team") return row.team_key;
  if (scope === "region") return row.region_key;
  return row.division_key;
}

function buildScopeRanks(rows: RankInputRow[], scope: RankScope) {
  const buckets = new Map<string, RankInputRow[]>();

  for (const row of rows) {
    if (row.composite_score == null) continue;

    const key = getScopeKey(row, scope);
    if (!key) continue;

    const arr = buckets.get(key) ?? [];
    arr.push(row);
    buckets.set(key, arr);
  }

  const result = new Map<string, RankSeat>();

  for (const bucket of buckets.values()) {
    const ranked = rankBucket(bucket);
    for (const [personId, seat] of ranked.entries()) {
      result.set(personId, seat);
    }
  }

  return result;
}

export function resolveRankContextByTech(
  rows: RankInputRow[],
  config: RankResolverConfig = {}
): RankContextByPerson {
  const scopes: RankScope[] = config.scopes ?? ["team", "region", "division"];

  const team = scopes.includes("team") ? buildScopeRanks(rows, "team") : new Map();
  const region = scopes.includes("region")
    ? buildScopeRanks(rows, "region")
    : new Map();
  const division = scopes.includes("division")
    ? buildScopeRanks(rows, "division")
    : new Map();

  const out: RankContextByPerson = new Map();

  for (const row of rows) {
    out.set(row.person_id, {
      team: team.get(row.person_id) ?? null,
      region: region.get(row.person_id) ?? null,
      division: division.get(row.person_id) ?? null,
    });
  }

  return out;
}