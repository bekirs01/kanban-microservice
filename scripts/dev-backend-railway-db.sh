#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

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

exec "$SCRIPT_DIR/docker-compose.sh" --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.railway-db.yml up -d rabbitmq auth-service tasks-service notifications-service api-gateway web
