#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-kanban-microservice-main}"
source "$SCRIPT_DIR/docker-env.sh"
if ! ensure_docker_daemon; then
  echo "Docker daemon not reachable. Start Docker Desktop or run: colima start"
  exit 1
fi
exec docker compose "$@"
