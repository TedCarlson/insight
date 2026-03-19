import { NextRequest, NextResponse } from "next/server";
import { getMetricFtrPayload } from "@/features/tech/metrics/lib/getMetricFtrPayload.server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const person_id = searchParams.get("person_id");
  const tech_id = searchParams.get("tech_id");
  const range = searchParams.get("range") as "FM" | "3FM" | "12FM";

  if (!person_id || !tech_id || !range) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const payload = await getMetricFtrPayload({
      person_id,
      tech_id,
      range,
    });

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Failed to load FTR payload" },
      { status: 500 }
    );
  }
}