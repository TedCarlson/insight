import type { SupabaseClient } from "@/shared/data/supabase/types";
import type { ApiError } from "../types";

export type ApiModuleCtx = {
  supabase: SupabaseClient;
  api: () => SupabaseClient;

  normalize: (err: any) => ApiError;

  compactRecord: <T extends Record<string, any>>(obj: T) => Partial<T>;

  rpcWithFallback: <T>(
    fn: string,
    argAttempts: Array<Record<string, any> | undefined>
  ) => Promise<T>;

  rpcWrite: <T>(
    schema: "api" | "public",
    fn: string,
    args?: Record<string, any> | null
  ) => Promise<T>;
};