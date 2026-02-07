import { NextResponse } from "next/server";
import { TABLE_RULES } from "./_lib/tableRules";
import { requireAdmin } from "./_lib/guards";

export async function GET() {
  await requireAdmin();

  return NextResponse.json({
    tables: Object.entries(TABLE_RULES).map(([key, t]) => ({
      key,
      label: t.label,
      group: t.group,
      readOnly: !t.allowCreate && t.editableColumns.length === 0,
    })),
  });
}