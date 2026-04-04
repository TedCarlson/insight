export function groupFactsByTech(rows: any[]) {
  const map = new Map<string, any[]>();

  for (const row of rows) {
    const key = String(row.tech_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return map;
}