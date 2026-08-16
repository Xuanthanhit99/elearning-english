export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | string;

export type CurrentUser = {
  id: string;
  fullname: string;
  email: string;
  avatar?: string | null;
  username?: string | null;
  bio?: string | null;
  goal?: string | null;
  interests?: string[];
  phone?: string | null;
  level?: number | null;
  xp?: number | null;
  isPro?: boolean | null;
  role?: string | null;
  englishLevel?: string | null;
  learningGoal?: string | null;
  createAt?: string | null;
  status?: UserStatus;
};

export type LoginRequest = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  user: CurrentUser;
  accessToken: string;
  refreshToken: string;
  twoFactorRequired?: boolean;
};

export type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  message?: string;
  user: Pick<CurrentUser, 'id' | 'email' | 'fullname' | 'role' | 'status' | 'createAt'>;
};

export type MeResponse = {
  success: boolean;
  data: {
    getUser: CurrentUser;
  };
};
