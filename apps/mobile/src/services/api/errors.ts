import { AxiosError } from 'axios';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type BackendErrorData = {
  message?: string | string[];
  error?: string;
};

function pickBackendMessage(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const value = data as BackendErrorData;
  if (Array.isArray(value.message)) return value.message.join('\n');
  if (typeof value.message === 'string') return value.message;
  if (typeof value.error === 'string') return value.error;
  return null;
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const backendMessage = pickBackendMessage(error.response?.data);

    if (backendMessage) {
      return new ApiError(backendMessage, status);
    }

    if (error.code === 'ERR_NETWORK') {
      return new ApiError('Không có kết nối mạng.');
    }

    if (status === 401) {
      return new ApiError('Phiên đăng nhập đã hết hạn.', status);
    }

    return new ApiError('Không thể kết nối đến máy chủ.', status);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('Đã có lỗi xảy ra.');
}
