export interface TokenPayload {
  email: string;
  sub: number; // user.id
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface EmailVerification {
  code: string;
  expires: Date;
}
