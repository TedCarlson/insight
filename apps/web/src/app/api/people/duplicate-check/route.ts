// path: apps/web/src/app/api/people/duplicate-check/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/data/supabase/admin";
import { supabaseServer } from "@/shared/data/supabase/server";

type PeopleDuplicateRow = {
  person_id: string;
  full_name: string | null;
  status: string | null;
  tech_id: string | null;
  mobile: string | null;
  email: string | null;
  nt_login: string | null;
  csg: string | null;
  active_assignment_count: number | null;
  active_orgs: string | null;
};

function clean(value: string | null) {
  const next = String(value ?? "").trim();
  return next || null;
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function matchReasons(row: PeopleDuplicateRow, args: {
  q: string | null;
  techId: string | null;
  mobile: string | null;
  email: string | null;
  ntLogin: string | null;
}) {
  const reasons: string[] = [];

  if (args.q && normalize(row.full_name) === normalize(args.q)) {
    reasons.push("Exact name match");
  } else if (
    args.q &&
    normalize(row.full_name).includes(normalize(args.q)) &&
    normalize(args.q).length >= 4
  ) {
    reasons.push("Similar name");
  }

  if (args.techId && normalize(row.tech_id) === normalize(args.techId)) {
    reasons.push("Same Tech ID");
  }

  if (args.mobile && normalize(row.mobile) === normalize(args.mobile)) {
    reasons.push("Same mobile");
  }

  if (args.email && normalize(row.email) === normalize(args.email)) {
    reasons.push("Same email");
  }

  if (args.ntLogin && normalize(row.nt_login) === normalize(args.ntLogin)) {
    reasons.push("Same NT login");
  }

  return reasons;
}

export async function GET(req: Request) {
  const userClient = await supabaseServer();
  const adminClient = await supabaseAdmin();

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const q = clean(searchParams.get("q"));
  const techId = clean(searchParams.get("tech_id"));
  const mobile = clean(searchParams.get("mobile"));
  const email = clean(searchParams.get("email"));
  const ntLogin = clean(searchParams.get("nt_login"));

  const searchValue = techId ?? ntLogin ?? email ?? mobile ?? q;

  if (!searchValue || searchValue.length < 2) {
    return NextResponse.json({ matches: [] });
  }

  const { data, error } = await adminClient.rpc("people_staging_search", {
    p_query: searchValue,
    p_limit: 8,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = ((data ?? []) as PeopleDuplicateRow[])
    .map((row) => ({
      ...row,
      match_reasons: matchReasons(row, {
        q,
        techId,
        mobile,
        email,
        ntLogin,
      }),
    }))
    .filter((row) => row.match_reasons.length > 0)
    .slice(0, 5);

  return NextResponse.json({ matches });
}