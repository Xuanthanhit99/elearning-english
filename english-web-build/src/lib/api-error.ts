import { AxiosError } from "axios";

export type NormalizedApiError = {
  message: string;
  status?: number;
  code?: string;
  requestId?: string;
  details?: unknown;
};

export type ApiErrorLike = Error & {
  normalized?: NormalizedApiError;
  response?: AxiosError["response"];
};

const DEFAULT_MESSAGE = "Có lỗi xảy ra. Vui lòng thử lại.";

function normalizeMessage(value: unknown, fallback = DEFAULT_MESSAGE) {
  if (Array.isArray(value)) {
    const message = value.filter(Boolean).join("\n");
    return message || fallback;
  }

  return typeof value === "string" && value.trim() ? value : fallback;
}

export function normalizeApiError(
  error: unknown,
  fallback = DEFAULT_MESSAGE,
): NormalizedApiError {
  const axiosError = error as AxiosError<any>;
  const data = axiosError?.response?.data;

  if (data && typeof data === "object") {
    return {
      message: normalizeMessage(data.message, fallback),
      status: axiosError.response?.status ?? data.statusCode,
      code: typeof data.error === "string" ? data.error : undefined,
      requestId:
        typeof data.requestId === "string" ? data.requestId : undefined,
      details: data,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallback,
      status: axiosError?.response?.status,
    };
  }

  return { message: fallback };
}

export function getApiErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE) {
  const apiError = error as ApiErrorLike;
  return (
    apiError.normalized?.message ?? normalizeApiError(error, fallback).message
  );
}

export function attachNormalizedApiError<T extends Error>(
  error: T,
  fallback = DEFAULT_MESSAGE,
) {
  const apiError = error as T & { normalized?: NormalizedApiError };
  apiError.normalized = normalizeApiError(error, fallback);

  if (apiError.normalized.message) {
    apiError.message = apiError.normalized.message;
  }

  return apiError;
}
