#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if [ ! -f apps/web/.env ] && [ -f apps/web/.env.example ]; then
  cp apps/web/.env.example apps/web/.env
fi

BACKEND_HEALTH="${BACKEND_HEALTH_URL:-http://127.0.0.1:3001/api/health}"
WAIT_ATTEMPTS="${WAIT_GATEWAY_ATTEMPTS:-90}"

wait_for_gateway() {
  local i=1
  while [ "$i" -le "$WAIT_ATTEMPTS" ]; do
    if curl -sf "$BACKEND_HEALTH" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done
  return 1
}

if curl -sf "$BACKEND_HEALTH" >/dev/null 2>&1; then
  exec npm run dev --workspace=@challenge/web -- --host 0.0.0.0 --port "${PORT:-3000}"
fi

echo "[dev] Starting Docker backend..."
if ! "$SCRIPT_DIR/docker-compose.sh" up -d --build db rabbitmq auth-service tasks-service notifications-service api-gateway; then
  echo "[dev] docker compose failed. Try: npm run docker:clear-cache && npm run colima:reset"
  exit 1
fi

echo "[dev] Waiting for API gateway at ${BACKEND_HEALTH} ..."
if wait_for_gateway; then
  exec npm run dev --workspace=@challenge/web -- --host 0.0.0.0 --port "${PORT:-3000}"
fi

echo "[dev] Gateway did not become healthy."
"$SCRIPT_DIR/docker-compose.sh" logs api-gateway auth-service tasks-service notifications-service --tail 80 2>/dev/null || true
exit 1
