type Translate = (key: string) => string;

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

function hasResponse(error: unknown): boolean {
  return !!(error as { response?: unknown })?.response;
}

export function messageForLoginFailure(error: unknown, t: Translate): string {
  if (!hasResponse(error)) {
    return t("auth.loginNetworkError");
  }
  const status = statusOf(error);
  if (status === 401 || status === 404) {
    return t("auth.loginFailedGeneric");
  }
  if (status === 502 || status === 503 || status === 504) {
    return t("auth.loginServerUnavailable");
  }
  return t("auth.loginErrorFallback");
}

export function messageForRegistrationFailure(error: unknown, t: Translate): string {
  if (!hasResponse(error)) {
    return t("auth.registerNetworkError");
  }
  const status = statusOf(error);
  if (status === 409) {
    return t("auth.registerAccountExists");
  }
  return t("auth.registerErrorFallback");
}
