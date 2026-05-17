#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/docker-env.sh"
if ! ensure_docker_daemon; then
  echo "Docker not reachable."
  exit 1
fi
if docker buildx version >/dev/null 2>&1; then
  docker buildx prune -af || true
fi
docker builder prune -af 2>/dev/null || true
echo "Docker cache pruned (buildx + legacy builder where available)."
echo "If blob or mkdir docker-builder errors persist: npm run colima:reset"
