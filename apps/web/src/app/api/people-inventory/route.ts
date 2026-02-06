import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/data/supabase/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";

type InviteStatus = "not_invited" | "invited_pending" | "active";

type Row = {
  person_id: string;
  full_name: string | null;
  emails: string | null;
  email_primary: string | null;
  email_dupe_count: number;

  fuse_emp_id: string | null;
  fuse_dupe_count: number;

  active: boolean | null;

  pc_org_rows: number;
  pc_org_active_rows: number;

  assignment_rows: number;
  assignment_active_rows: number;

  leadership_edges: number;

  auth_user_id: string | null;
  profile_status: string | null;

  invite_status: InviteStatus;
  invited_at: string | null;
  last_sign_in_at: string | null;
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "500"), 1), 2000);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0);

  const sb = await supabaseServer();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Gate via is_app_owner()
  const { data: isOwner, error: ownerErr } = await (sb as any).schema("api").rpc("is_app_owner");
  if (ownerErr) return NextResponse.json({ ok: false, error: ownerErr.message }, { status: 500 });
  if (!isOwner) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  // Pull inventory rows from DB function
  const { data: inv, error: invErr } = await (sb as any)
    .schema("api")
    .rpc("admin_people_inventory", { p_limit: limit, p_offset: offset });

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const rows = (inv ?? []) as any[];

  const admin = supabaseAdmin();
  const authIds = Array.from(
    new Set(rows.map((r) => String(r?.auth_user_id ?? "")).filter(Boolean)),
  );

  const authById = new Map<string, { invited_at: string | null; last_sign_in_at: string | null }>();
  await mapLimit(authIds, 10, async (id) => {
    const res = await admin.auth.admin.getUserById(id);
    if (res.error || !res.data?.user) {
      authById.set(id, { invited_at: null, last_sign_in_at: null });
      return null as any;
    }
    const u: any = res.data.user;
    authById.set(id, {
      invited_at: u.invited_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
    });
    return null as any;
  });

  const out: Row[] = rows.map((r) => {
    const authId = r.auth_user_id ? String(r.auth_user_id) : null;
    const auth = authId ? (authById.get(authId) ?? { invited_at: null, last_sign_in_at: null }) : { invited_at: null, last_sign_in_at: null };

    const invite_status: InviteStatus =
      !authId ? "not_invited"
        : auth.last_sign_in_at ? "active"
        : "invited_pending";

    return {
      person_id: String(r.person_id),
      full_name: r.full_name ?? null,
      emails: r.emails ?? null,
      email_primary: r.email_primary ?? null,
      email_dupe_count: Number(r.email_dupe_count ?? 0),

      fuse_emp_id: r.fuse_emp_id ?? null,
      fuse_dupe_count: Number(r.fuse_dupe_count ?? 0),

      active: r.active ?? null,

      pc_org_rows: Number(r.pc_org_rows ?? 0),
      pc_org_active_rows: Number(r.pc_org_active_rows ?? 0),

      assignment_rows: Number(r.assignment_rows ?? 0),
      assignment_active_rows: Number(r.assignment_active_rows ?? 0),

      leadership_edges: Number(r.leadership_edges ?? 0),

      auth_user_id: authId,
      profile_status: r.profile_status ?? null,

      invite_status,
      invited_at: auth.invited_at,
      last_sign_in_at: auth.last_sign_in_at,
    };
  });

  return NextResponse.json({ ok: true, rows: out, limit, offset }, { status: 200 });
}
