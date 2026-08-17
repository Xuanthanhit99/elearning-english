export type AuthUser = {
  id: string;
  fullname: string;
  email: string;
  role: string;
  status: string;
};

export type LoginRequest = {
  email: string;
  password: string;
  rememberMe?: boolean;
  otp?: string;
  recoveryCode?: string;
};

export type LoginSuccessResponse = {
  success: true;
  message: string;

  user: AuthUser;

  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type TwoFactorResponse = {
  success: false;
  twoFactorRequired: true;
  message: string;
};

export type LoginResponse =
  | LoginSuccessResponse
  | TwoFactorResponse;

export type RefreshResponse = {
  success: true;
  message: string;

  accessToken: string;
  refreshToken: string;
  expiresIn: string;

  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      status: string;
      avatar?: string | null;
    };
  };
};