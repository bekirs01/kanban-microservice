export interface JwtTokenPayload {
  sub: string;
  username: string;
  role?: string;
  iat: string;
  exp: string;
}