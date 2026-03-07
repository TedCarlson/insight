import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

export const runtime = "nodejs";

type ColorRow = {
  kpi_key: string;
  band_key: string;
  color_token?: string | null;
};

async function isOwner(sb: any) {
  try {
    const { data, error } = await sb.rpc("is_owner");
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

async function hasAnyRole(admin: any, auth_user_id: string, roleKeys: string[]) {
  const { data, error } = await admin
    .from("user_roles")
    .select("role_key")
    .eq("auth_user_id", auth_user_id);

  if (error) return false;

  const roles = (data ?? [])
    .map((r: any) => String(r?.role_key ?? ""))
    .filter(Boolean);

  return roles.some((rk: string) => roleKeys.includes(rk));
}

async function elevatedGate() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const admin = supabaseAdmin();
  const uid = user.id;

  const owner = await isOwner(sb);
  const elevated =
    owner ||
    (await hasAnyRole(admin, uid, ["admin", "dev", "director", "vp"]));

  if (!elevated) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, admin };
}

export async function GET() {
  const gate = await elevatedGate();
  if (!gate.ok) return gate.res;

  const admin = gate.admin;

  const { data, error } = await admin
    .from("metrics_kpi_rubric")
    .select("kpi_key,band_key,color_token,is_active")
    .or("is_active.is.null,is_active.eq.true")
    .order("kpi_key")
    .order("band_key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    rows: (data ?? []).map((r: any) => ({
      kpi_key: r.kpi_key,
      band_key: r.band_key,
      color_token: r.color_token ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const gate = await elevatedGate();
  if (!gate.ok) return gate.res;

  const admin = gate.admin;

  const body = (await req.json().catch(() => null)) as
    | { rows?: ColorRow[] }
    | null;

  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updates = body.rows
    .filter(
      (r) =>
        typeof r.kpi_key === "string" &&
        r.kpi_key.trim() &&
        typeof r.band_key === "string" &&
        r.band_key.trim()
    )
    .map((r) => ({
      kpi_key: r.kpi_key.trim(),
      band_key: r.band_key.trim(),
      color_token:
        r.color_token === undefined || r.color_token === null
          ? null
          : String(r.color_token).trim() || null,
      updated_at: new Date().toISOString(),
    }));

  for (const row of updates) {
    const { error } = await admin
      .from("metrics_kpi_rubric")
      .update({
        color_token: row.color_token,
        updated_at: row.updated_at,
      })
      .eq("kpi_key", row.kpi_key)
      .eq("band_key", row.band_key);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { data, error } = await admin
    .from("metrics_kpi_rubric")
    .select("kpi_key,band_key,color_token,is_active")
    .or("is_active.is.null,is_active.eq.true")
    .order("kpi_key")
    .order("band_key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    rows: (data ?? []).map((r: any) => ({
      kpi_key: r.kpi_key,
      band_key: r.band_key,
      color_token: r.color_token ?? null,
    })),
  });
}