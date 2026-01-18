// apps/web/src/app/api/auth/bootstrap/route.ts
import { NextResponse } from "next/server";
import { bootstrapProfileServer } from "@/lib/auth/bootstrapProfile.server";

/**
 * POST /api/auth/bootstrap
 *
 * Ensures the current authed user has a user_profile row and hydrates metadata linkages.
 * Safe to call from the client immediately after login / set-password flows.
 */
export async function POST() {
  const result = await bootstrapProfileServer();
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result, { status: 200 });
}

export async function GET() {
  // convenience ping / debug
  const result = await bootstrapProfileServer();
  const status = result.ok ? 200 : 401;
  return NextResponse.json(result, { status });
}
