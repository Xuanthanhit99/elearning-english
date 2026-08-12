import { env } from "@/config/env";
import { ApiError } from "./ApiError";


type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options;

  const response = await fetch(
    `${env.API_URL}${path}`,
    {
      ...requestOptions,

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...headers,
      },
    },
  );

  let data: unknown = null;

  const contentType =
    response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorCode(data),
      getErrorMessage(data),
      data,
    );
  }

  return data as T;
}

function getErrorCode(data: unknown): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string'
  ) {
    return data.code;
  }

  return 'UNKNOWN_ERROR';
}

function getErrorMessage(data: unknown): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data
  ) {
    const message = data.message;

    if (typeof message === 'string') {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every(
        (item) => typeof item === 'string',
      )
    ) {
      return message.join(', ');
    }
  }

  return 'Request failed';
}

export const apiClient = {
  get<T>(
    path: string,
    options?: RequestOptions,
  ) {
    return request<T>(path, {
      ...options,
      method: 'GET',
    });
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(path, {
      ...options,
      method: 'POST',

      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    });
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(path, {
      ...options,
      method: 'PATCH',

      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    });
  },

  delete<T>(
    path: string,
    options?: RequestOptions,
  ) {
    return request<T>(path, {
      ...options,
      method: 'DELETE',
    });
  },
};