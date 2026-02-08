import type { ApiError } from "../types";

export function normalizeApiError(err: any): ApiError {
  return {
    message: [err?.message, err?.details, err?.hint].filter(Boolean).join(" — ") || "Unknown error",
    code: err?.code,
    status: err?.status,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };
}