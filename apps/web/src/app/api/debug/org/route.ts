// apps/web/src/app/api/debug/org/route.ts
import { NextResponse } from "next/server";
import { requireSelectedPcOrgServer } from "@/lib/auth/requireSelectedPcOrg.server";

export const runtime = "nodejs";

export async function GET() {
  const scope = await requireSelectedPcOrgServer();
  return NextResponse.json(scope);
}