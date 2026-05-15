
export class ResponseAuthDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string,
    username: string,
    email: string,
  }
}