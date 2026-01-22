import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Payload = { signedIn: boolean; active: boolean };

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const base: Payload = { signedIn: false, active: false };

  if (!url || !anon) {
    return NextResponse.json(base, { status: 200 });
  }

  // Cookie carrier response (Supabase may refresh cookies)
  const cookieCarrier = NextResponse.next();

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieCarrier.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (!user) {
    const res = NextResponse.json(base, { status: 200 });
    cookieCarrier.cookies.getAll().forEach(({ name, value }) => res.cookies.set(name, value));
    return res;
  }

  // Owner bypass
  try {
    const { data } = await supabase.rpc("is_owner");
    if (data) {
      const res = NextResponse.json({ signedIn: true, active: true } satisfies Payload, { status: 200 });
      cookieCarrier.cookies.getAll().forEach(({ name, value }) => res.cookies.set(name, value));
      return res;
    }
  } catch {
    // ignore
  }

  // status gate
  let active = false;
  try {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const status = (profile as { status?: string } | null)?.status ?? null;
    active = status === "active";
  } catch {
    active = false;
  }

  const res = NextResponse.json({ signedIn: true, active } satisfies Payload, { status: 200 });
  cookieCarrier.cookies.getAll().forEach(({ name, value }) => res.cookies.set(name, value));
  return res;
}
