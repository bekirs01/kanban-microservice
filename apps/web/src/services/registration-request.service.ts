import type { SubmitRegistrationRequestDto } from "@challenge/types";
import { api } from "./api";

export async function submitRegistrationRequestApi(
  dto: SubmitRegistrationRequestDto,
): Promise<{ requestId: string }> {
  const { data } = await api.post<{ requestId: string }>(
    "/api/auth/register-request",
    dto,
  );
  return data;
}
