import type { ApiEnvelope } from "./listening.types";

export function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value
  ) {
    return (value as ApiEnvelope<T>).data;
  }

  return value as T;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
) {
  const apiError = error as {
    response?: {
      data?: {
        message?: string | string[];
      };
    };
    message?: string;
  };

  const message = apiError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message ?? apiError.message ?? fallback;
}

export function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remain,
  ).padStart(2, "0")}`;
}
