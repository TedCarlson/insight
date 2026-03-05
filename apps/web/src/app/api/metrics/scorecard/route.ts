import { NextResponse } from "next/server";
import { getTechScorecardPayload } from "@/features/metrics/scorecard";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const person_id = url.searchParams.get("person_id") ?? "me";
  const payload = await getTechScorecardPayload({ person_id });
  return NextResponse.json(payload);
}