// apps/web/src/app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}