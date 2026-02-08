import type { SupabaseClient } from "@/shared/data/supabase/types";

export async function ensureSessionFresh(supabase: SupabaseClient): Promise<void> {
  const auth: any = (supabase as any)?.auth;
  if (!auth?.getSession) return;

  const { data, error } = await auth.getSession();
  if (error) return;

  const session = data?.session;
  if (!session) return;

  const expiresAt = session.expires_at ?? 0; // seconds
  const now = Math.floor(Date.now() / 1000);

  // Refresh if expiring within 2 minutes
  if (expiresAt && expiresAt - now < 120) {
    await auth.refreshSession();
  }
}

export async function getAccessToken(supabase: SupabaseClient): Promise<string> {
  const auth: any = (supabase as any)?.auth;
  if (!auth?.getSession) return "";

  const { data } = await auth.getSession();
  return data?.session?.access_token ?? "";
}