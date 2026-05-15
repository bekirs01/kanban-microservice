#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DOCKER_HOST="${DOCKER_HOST:-unix://${HOME}/.colima/default/docker.sock}"

if command -v colima >/dev/null 2>&1; then
  if ! docker info >/dev/null 2>&1; then
    colima stop >/dev/null 2>&1 || true
    colima start
    docker context use colima 2>/dev/null || true
  fi
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is still not reachable."
  echo "Try: colima delete -f && colima start"
  echo "Then run: npm run dev:backend"
  exit 1
fi

exec docker compose up -d --build db rabbitmq auth-service tasks-service notifications-service api-gateway
