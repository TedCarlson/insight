"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type SessionState = {
  ready: boolean;
  signedIn: boolean;
  user: User | null;
  userId: string | null;
  email: string | null;
  isOwner: boolean;
  canSeeAdmin: boolean;
};

const SessionContext = createContext<SessionState | null>(null);

function isManagerPlus(positionTitle: unknown) {
  if (typeof positionTitle !== "string") return false;
  const t = positionTitle.trim().toLowerCase();
  return t === "manager" || t === "director" || t === "vp" || t === "ceo" || t === "cfo" || t === "coo";
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [state, setState] = useState<SessionState>({
    ready: false,
    signedIn: false,
    user: null,
    userId: null,
    email: null,
    isOwner: false,
    canSeeAdmin: false,
  });

  // Avoid spamming is_owner RPC on token refresh
  const lastOwnerCheckUserId = useRef<string | null>(null);

  async function refresh(event?: AuthChangeEvent, session?: Session | null) {
    // Prefer session user if provided
    const sessionUser = session?.user ?? null;

    let user: User | null = sessionUser;
    if (!user) {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    }

    const signedIn = !!user;
    const userId = user?.id ?? null;
    const email = user?.email ?? null;

    // Default values when signed out
    if (!signedIn) {
      lastOwnerCheckUserId.current = null;
      setState({
        ready: true,
        signedIn: false,
        user: null,
        userId: null,
        email: null,
        isOwner: false,
        canSeeAdmin: false,
      });
      return;
    }

    // Manager+ based on metadata (same idea FooterHelp used before)
    const title = (user as any)?.user_metadata?.position_title;
    const managerPlus = isManagerPlus(title);

    // Only run owner RPC when user changes or on explicit events (SIGNED_IN/USER_UPDATED)
    let isOwner = state.isOwner;
    const shouldOwnerCheck =
      userId &&
      (lastOwnerCheckUserId.current !== userId ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "SIGNED_OUT");

    if (shouldOwnerCheck) {
      try {
        const { data } = await supabase.rpc("is_owner");
        isOwner = !!data;
      } catch {
        isOwner = false;
      }
      lastOwnerCheckUserId.current = userId;
    }

    setState({
      ready: true,
      signedIn: true,
      user,
      userId,
      email,
      isOwner,
      canSeeAdmin: isOwner || managerPlus,
    });
  }

  useEffect(() => {
    let alive = true;

    // Initial hydrate
    refresh().catch(() => {
      if (!alive) return;
      setState((s) => ({ ...s, ready: true }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        // Always refresh, but owner check throttled above
        refresh(event, session).catch(() => {});
      }
    );

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
