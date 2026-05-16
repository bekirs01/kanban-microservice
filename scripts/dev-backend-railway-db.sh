#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DOCKER_HOST="${DOCKER_HOST:-unix://${HOME}/.colima/default/docker.sock}"

ENV_FILE=".env.railway.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  echo "Run: cp .env.railway.example $ENV_FILE"
  echo "Then set RAILWAY_DB_HOST, RAILWAY_DB_PORT, RAILWAY_DB_USER, RAILWAY_DB_PASS, RAILWAY_DB_NAME from Railway → Postgres → Variables / Connect."
  exit 1
fi

check_nonempty() {
  local key="$1"
  local line val
  line=$(grep "^${key}=" "$ENV_FILE" | tail -n1 || true)
  if [ -z "$line" ]; then
    echo "Error: missing $key in $ENV_FILE"
    exit 1
  fi
  val="${line#*=}"
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  if [ -z "$val" ]; then
    echo "Error: $key is empty in $ENV_FILE. Copy PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE from Railway Postgres."
    exit 1
  fi
}

for key in RAILWAY_DB_HOST RAILWAY_DB_PORT RAILWAY_DB_USER RAILWAY_DB_PASS RAILWAY_DB_NAME; do
  check_nonempty "$key"
done

if command -v colima >/dev/null 2>&1; then
  if ! docker info >/dev/null 2>&1; then
    colima stop >/dev/null 2>&1 || true
    colima start
    docker context use colima 2>/dev/null || true
  fi
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not reachable."
  exit 1
fi

exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.railway-db.yml up -d rabbitmq auth-service tasks-service notifications-service api-gateway web
