export type ApiSuccessResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type RetriableRequestConfig = {
  _retry?: boolean;
};
